# Backend Function Assessment (Amplify Gen 1)

Date: 2026-02-13  
Scope: `amplify/backend/function/*` Lambda functions (41 total, no code changes made)

## How I assessed this
- Static analysis only (repo/config/code references), no CloudWatch/production traffic logs.
- Mapped each function against:
  - API Gateway routes in `amplify/backend/api/*/cli-inputs.json`
  - Auth/S3/schedule triggers in `amplify/backend/backend-config.json` and function templates
  - Frontend call sites in `src/`
  - Lambda-to-Lambda invocation paths in function code
- Ranking below is **most to least likely to remove/reconsider**, based on observed wiring and local usage evidence.

## Top quick wins to reconsider first
1. `memesrcUpdateSubtitles` - no route/trigger and still returns `"Hello from Lambda!"`.
2. `memesrcGraphQL` - no route/trigger and appears to be a hardcoded test query utility.
   Clarification: this is **not** the core AppSync GraphQL API. The core GraphQL API is the `api/memesrc` AppSync resource.
3. `S3Trigger016e2873` - still wired to S3 trigger, but the handler logic is commented out (effectively no-op).
4. `memesrcVote` - legacy vote handler, but `/vote` is routed to `memesrcUserFunction` now.
5. `memesrcIndexToOpenSearch` + `memesrcOpenSearch` - appear to be an older indexing path not connected to current API routes.

## Full prioritized list (most to least likely to remove/reconsider)

| Rank | Function | Potential | Current usage evidence | What it appears to do |
|---|---|---|---|---|
| 1 | `memesrcUpdateSubtitles` | Very High | No route, no schedule, no internal caller | Placeholder/stub Lambda |
| 2 | `memesrcGraphQL` | Very High | No route, no trigger, no internal caller | Test-style signed AppSync request helper |
| 3 | `S3Trigger016e2873` | Very High | S3-triggered, but runtime logic is commented | Intended S3 upload hook to user function |
| 4 | `memesrcVote` | Very High | No route/trigger/caller; `/vote` route points elsewhere | Legacy vote mutation flow |
| 5 | `memesrcIndexToOpenSearch` | High | No API route/trigger; no observed caller | Wrapper that invokes `memesrcOpenSearch` |
| 6 | `memesrcOpenSearch` | High | Only referenced by `memesrcIndexToOpenSearch` | Legacy CSV -> OpenSearch indexer |
| 7 | `memesrcAnalyticsInitDBs` | High | No route, no schedule | One-time Athena DB/table bootstrap utility |
| 8 | `memesrcAnalyticsAddDailyPartition` | High | No route, `CloudWatchRule` set to `NONE` | Athena partition maintenance utility |
| 9 | `memesrcc3c71449PostConfirmation` | High | Auth trigger attached, custom logic currently no-op | Post-signup Cognito trigger hook |
| 10 | `SearchFunction` | Medium-High | `/search` route; only one frontend warmup call | Legacy OpenSearch search endpoint |
| 11 | `memesrcFrameFunction` | Medium | `/frame` route; one fallback callsite in legacy frame handler | Legacy frame lookup + analytics write |
| 12 | `memesrcRandom` | Medium | `/random` route; warmup + legacy random flow | Random frame endpoint + analytics write |
| 13 | `memesrcAnalyticsReporting` | Medium | Monthly schedule + `/analytics` route; frontend route calls commented out | Athena metrics writer to `AnalyticsMetrics` |
| 14 | `memesrcAnalyticsMsck` | Medium | Monthly schedule only | Athena MSCK repair job |
| 15 | `memesrcPublicStripeFunction` | Medium | `/stripeVerification` route, no direct frontend calls | Stripe checkout return handler |
| 16 | `memesrcStripeCallback` | Medium | `/stripeCallback` route, no direct frontend calls | Stripe webhook -> user subscription updates |
| 17 | `memesrcRecoverUsername` | Medium-Low | One direct frontend call (`/forgotusername`) | Cognito email -> username recovery email |
| 18 | `memesrcDeleteFromLibrary` | Medium-Low | One direct frontend call (`/library/delete`) | Delete library assets from storage |
| 19 | `memesrcGetSignedUrl` | Medium-Low | Two direct frontend calls (`/getSignedUrl`) | Generate signed S3 GET URLs |
| 20 | `memesrcTVDB` | Medium-Low | Four frontend calls (`/tvdb/*`) | TVDB proxy/search/details |
| 21 | `memesrcVoteSearchSeries` | Medium-Low | Two frontend calls (`/votes/search`) | Prefix search against vote index |
| 22 | `memesrcAggregateVotes` | Low-Medium | Scheduled (`rate(12 hours)`) + manual `/votes/refresh` call | Vote aggregation + metrics + vote index refresh |
| 23 | `memesrcCreateUsageEvent` | Low-Medium | One explicit callsite, but used by shared tracking utility | Persist usage telemetry events |
| 24 | `memesrcSourceMediaZipProcessor` | Low-Medium | One admin call (`/sourceMedia/extract`) | Source media extraction orchestrator |
| 25 | `memesrcApproveMedia` | Low-Medium | One admin call (`/sourceMedia/approve`) | Approval wrapper that invokes `memesrcUpdateMedia` |
| 26 | `memesrcStartIndexingAndPublishing` | Low-Medium | Two admin calls (`/media/index`) | Wrapper that invokes `memesrcIndexAndPublish` |
| 27 | `memesrcMoveApprovedMedia` | Low | Internal caller: `memesrcUpdateMedia` | Move approved episode files from pending path |
| 28 | `memesrcIndexAndPublish` | Low | Internal caller: `memesrcStartIndexingAndPublishing` | Main OpenSearch indexing/publish pipeline |
| 29 | `memesrcZipExtractor` | Low | Internal caller: `memesrcSourceMediaZipProcessor` | Async zip extraction + status + email notifications |
| 30 | `memesrcUpdateMedia` | Low | Internal caller: `memesrcApproveMedia` | Core source media processing workflow |
| 31 | `memesrcUUID` | Low | 6 frontend callsites (`/uuid`) | UUID generator service |
| 32 | `memesrcThumbnailZipExtractor` | Very Low | Public/content API image-video route (`/v2/thumbnail/*`) | Reads subtitle clip from zip |
| 33 | `memesrcGif` | Very Low | Public/content API route (`/v2/gif/*`) | GIF generation from chunked video |
| 34 | `frameExtractor` | Very Low | Public/content API route (`/v2/frame/*`) | Frame extraction/caching from source video |
| 35 | `memesrcSearchV2` | Very Low | Public/content API route (`/v2/search/*`) + direct v2 fetch usage | Current V2 search backend |
| 36 | `memesrcinpainter` | Very Low | 4 frontend callsites (`/inpaint`) | Inpaint entrypoint + job kickoff |
| 37 | `memesrcOpenAI` | Very Low | Internal caller: `memesrcinpainter` | Background AI image processing/moderation/rate-limit/crediting |
| 38 | `AdminQueries9e1cafc6` | Very Low | Admin user pages call disable/enable/group actions | Cognito admin operations API |
| 39 | `memesrcc3c71449PreSignup` | Very Low | Cognito PreSignUp trigger | Duplicate email guard at signup |
| 40 | `memesrcc3c71449PreTokenGeneration` | Very Low | Cognito PreTokenGeneration trigger | Inject custom claims from AppSync user record |
| 41 | `memesrcUserFunction` | Very Low | 23 direct frontend calls + multiple internal Lambda callers | Primary backend for user, vote, subscription, notification workflows |

## Notes and caveats
- This is static code/config evidence only. Actual production traffic could change priority, especially for open routes (`/stripe*`, `/v2/*`, `/search`, `/random`).
- `memesrcContentApi` routes are not called through Amplify API client in `src/`, but V2 endpoints are used via direct fetch/URL patterns, so those route Lambdas are likely externally active.
- Lambda layers (`LambdaLayer` resources) were not ranked here since you asked for backend functions.

## Key evidence paths reviewed
- `amplify/backend/backend-config.json`
- `amplify/backend/api/publicapi/cli-inputs.json`
- `amplify/backend/api/memesrcContentApi/cli-inputs.json`
- `amplify/backend/api/AdminQueries/cli-inputs.json`
- `amplify/backend/storage/memesrcGeneratedImages/cli-inputs.json`
- `src/index.js`
- `src/pages/HomePage.js`
- `src/pages/V2SearchPage.js`
- `src/utils/frameHandler.js`
- `src/utils/trackUsageEvent.ts`
- `amplify/backend/function/S3Trigger016e2873/src/index.js`
- `amplify/backend/function/memesrcUpdateSubtitles/src/index.js`
- `amplify/backend/function/memesrcGraphQL/src/index.js`
- `amplify/backend/function/memesrcVote/src/index.js`
- `amplify/backend/function/memesrcUserFunction/src/index.js`
