# AirIQ Channel Manager Gateway

Stateless NestJS service exposing the private `/api-gateway/v1` API described in the AirIQ implementation brief. It has no database or ORM dependency. The AirIQ hotel backend remains responsible for mappings, offers, idempotency, booking state, payment, and reconciliation.

## Implemented

- Authentication intentionally disabled during standalone gateway development
- Request IDs, normalized response/error envelopes, DTO validation, health endpoints
- Provider registry and capability discovery
- DJUBO V9 availability mapping ported from the reference .NET repository, including requested payload flags and normalized room/rate/cancellation data
- HTTPS-only DJUBO configuration, `DJUBO-TOKEN` authentication, bounded read retries, timeouts, and concurrency limiting
- Availability, rate recheck, booking, verification, reservation lookup, and cancellation routes
- No invented STAAH, SiteMinder, or eZee integrations

DJUBO availability and operational APIs are implemented from the supplied **Djubo Direct V9 APIs (2026)** contract. Provider snake_case responses are converted recursively to camelCase at the gateway boundary.

Availability returns one flattened provider-neutral contract across channel adapters. Provider identity, hotel ID, status, party, rooms, and rate options are stable top-level fields. `trace.rawProviderResponse` retains the exact untouched provider body for diagnosing mapping differences, and `trace.mappingVersion` identifies the mapper contract. The route is not wrapped in the standard success envelope.

DJUBO booking submit accepts the minimal `partnerData` object keyed by the exact availability `room_id`. The same rate token may be repeated for multiple room IDs when those rooms use the same selected rate combination.

For pay-at-checkout bookings, `payments` and `paymentMethod` must both be absent, `finalPriceAtBooking.amount` must be `0`, and `finalPriceAtCheckout.amount` must be positive. When `payments` is supplied, `finalPriceAtBooking.amount` must be positive and equal `payments.amount`. Booking and checkout currencies must be valid matching three-letter uppercase codes.

DJUBO paths and methods are catalogued in `src/providers/djubo/api/djubo-api.constants.ts`. The base URL has a code default and can be overridden with `DJUBO_BASE_URL`; timeout, retry, and concurrency settings remain environment variables because they are deployment-specific.

`DJUBO_AUTH_TOKEN` may contain the raw access token or a `DJUBO-TOKEN`-prefixed value. The legacy `DJUBO_API_TOKEN` key is also accepted. The gateway sends `Authorization: DJUBO-TOKEN <token>`. `DJUBO_QUERY_KEY` and `DJUBO_AVAILABILITY_ID` are optional and also accept the legacy `QUERY_KEY` and `AVAILABILITY_ID` names. Configure them when they are issued by DJUBO. Credentials printed in provider documentation are never copied into the application.

Availability currency defaults from `DJUBO_DEFAULT_CURRENCY`; when it is unset, the adapter falls back to `INR`. Callers may omit `data.currency`.

## DJUBO operation routes

All routes use the same `{ context, data }` envelope as availability.

| Gateway route | DJUBO operation |
|---|---|
| `POST /internal/guests` | Guest creation |
| `POST /internal/guests/update` | Guest update |
| `POST /internal/guests/history` | Guest history search |
| `POST /internal/availability` | Booking availability |
| `POST /internal/bookings/submit` | Booking submit |
| `POST /internal/bookings/information` | Booking information |
| `POST /internal/reservations/fetch` | Fetch reservation |
| `POST /internal/rooms/availability` | Fetch room numbers |
| `POST /internal/rooms/status` | Fetch room status |
| `POST /internal/bookings/check-in` | Check-in |
| `POST /internal/bookings/check-out` | Check-out |
| `POST /internal/bookings/cancellation` | Cancellation/rules |
| `POST /internal/bookings/update` | Booking room/category update |

## Run

```bash
cp .env.example .env
npm install
npm run build
npm test
npm start
```

The gateway currently has no caller authentication, so all endpoints are reachable without an `Authorization` header. Add service-to-service authentication before exposing it outside a trusted development network. Provider base URLs must use HTTPS; redirects are disabled to reduce SSRF exposure.

## Source structure

```text
src/
|-- common/                 # errors, filters, HTTP transport, interceptors
|-- config/                 # validated environment configuration
|-- contracts/
|   |-- common/
|   |-- requests/
|   `-- responses/
|-- controllers/            # all HTTP endpoints
|-- dtos/
|   |-- requests/           # validated external request DTOs
|   `-- responses/          # API envelope DTOs
|-- factory/                # channel provider factory
|-- interfaces/             # provider contracts
|-- services/               # application orchestration
`-- providers/
    `-- djubo/
        |-- api/
        |-- client/
        |-- config/
        |-- mapper/
        |-- models/requests/
        |-- models/responses/
        `-- djubo-channel.provider.ts
```

## Important production gaps

Production credentials and sanitized real provider fixtures still require confirmation from DJUBO. A credential exposed in the reference repository was deliberately not copied and should be revoked by its owner. Booking, recheck, verification, lookup, and cancellation require actual provider contracts before implementation. Credential references are accepted in the contract but per-hotel secret resolution is not enabled until a trusted secret-store contract exists.
