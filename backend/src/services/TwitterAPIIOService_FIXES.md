# TwitterAPI.io Service - Endpoint Fixes

Based on the official documentation:
- https://docs.twitterapi.io/api-reference/endpoint/get_user_by_username
- https://docs.twitterapi.io/api-reference/endpoint/get_tweet_by_ids
- https://docs.twitterapi.io/api-reference/endpoint/user_login_v2

## Correct Endpoints

1. **Get User Info**: `GET /twitter/user/info` with `userName` (camelCase) parameter
2. **Get Tweets**: `GET /twitter/tweets` with `tweet_ids` parameter
3. **Login**: `POST /twitter/user_login_v2`
4. **Base URL**: `https://api.twitterapi.io` (no /v2)

## Changes Needed

1. Update `getUserProfile()` to use `/twitter/user/info` with `userName` parameter
2. Update `getUserTimeline()` to use `/twitter/user/last-tweets` with `userName` parameter
3. Update `searchTweets()` to use `/twitter/tweet/advanced-search`
4. Update `getTweetById()` to use `/twitter/tweets` with `tweet_ids` parameter
5. Update `login()` to use `/twitter/user_login_v2`
6. Update `postTweet()` to use `/twitter/tweet/create`

