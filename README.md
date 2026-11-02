# AirIQ Channel Manager Gateway

Stateless NestJS service exposing the private `/internal/v1` API described in the AirIQ implementation brief. It has no database or ORM dependency. The AirIQ hotel backend remains responsible for mappings, offers, idempotency, booking state, payment, and reconciliation.

## Implemented

- Authentication intentionally disabled during standalone gateway development
- Request IDs, normalized response/error envelopes, DTO validation, health endpoints
- Provider registry and capability discovery
- DJUBO V9 availability mapping ported from the reference .NET repository, including requested payload flags and normalized room/rate/cancellation data
- HTTPS-only DJUBO configuration, `DJUBO-TOKEN` authentication, bounded read retries, timeouts, and concurrency limiting
- Availability, rate recheck, booking, verification, reservation lookup, and cancellation routes
- No invented STAAH, SiteMinder, or eZee integrations

DJUBO availability and operational APIs are implemented from the supplied **Djubo Direct V9 APIs (2026)** contract. Provider snake_case responses are converted recursively to camelCase at the gateway boundary.

Availability returns a traceable dual response. `normalized` is the provider-neutral contract used across channel adapters, while `rawProviderResponse` is the exact untouched provider body used to diagnose mapping differences. The response also includes provider identity, hotel ID, request ID, and `mappingVersion`. The availability route is not wrapped in the standard success envelope. Consumers must retain the provider's actual party room ID, selected rate, and booking token for booking.

DJUBO booking submit accepts the minimal `partnerData` object keyed by the exact availability `room_id`. The same rate token may be repeated for multiple room IDs when those rooms use the same selected rate combination.

DJUBO paths and methods are catalogued in `src/providers/djubo/api/djubo-api.constants.ts`. The base URL has a code default and can be overridden with `DJUBO_BASE_URL`; timeout, retry, and concurrency settings remain environment variables because they are deployment-specific.

`DJUBO_AUTH_TOKEN` may contain the raw access token or a `DJUBO-TOKEN`-prefixed value. The legacy `DJUBO_API_TOKEN` key is also accepted. The gateway sends `Authorization: DJUBO-TOKEN <token>`. `DJUBO_QUERY_KEY` and `DJUBO_AVAILABILITY_ID` are optional and also accept the legacy `QUERY_KEY` and `AVAILABILITY_ID` names. Configure them when they are issued by DJUBO. Credentials printed in provider documentation are never copied into the application.

## DJUBO operation routes

All routes use the same `{ context, data }` envelope as availability.

| Gateway route | DJUBO operation |
|---|---|
| `POST /internal/v1/guests` | Guest creation |
| `POST /internal/v1/guests/update` | Guest update |
| `POST /internal/v1/guests/history` | Guest history search |
| `POST /internal/v1/availability` | Booking availability |
| `POST /internal/v1/bookings/submit` | Booking submit |
| `POST /internal/v1/bookings/information` | Booking information |
| `POST /internal/v1/reservations/fetch` | Fetch reservation |
| `POST /internal/v1/rooms/availability` | Fetch room numbers |
| `POST /internal/v1/rooms/status` | Fetch room status |
| `POST /internal/v1/bookings/check-in` | Check-in |
| `POST /internal/v1/bookings/check-out` | Check-out |
| `POST /internal/v1/bookings/cancellation` | Cancellation/rules |
| `POST /internal/v1/bookings/update` | Booking room/category update |

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
