# Project Victory Web System

1. Blocking of specific troll accounts, e.g. being able to block @joelgethinlewis from being able to interact at all
2. Blocking of tweets with specific keywords such as swear words, or non brand words such as Reebok. This list will be editable on the web interface.
3. Manual review of tweets that have passed 1) + 2) by the 5/10 person Nike team, who could be anywhere in the world
4. Final manual review of tweets that have passed 1) 2) and 3) by an onsite Nike legal/PR/marketing representative who will be taking legal responsibility for the text content - H&L and our team will not be legally responsible for any of the content that emerges from this project.

## Webpages

* /bad-words.html - Naughty words web interface
* /banned-users.html - Banned twitter screen names web interface
* /moderation-view.html#initial – Initial moderation web app
* /moderation-view.html#legal – Legal moderation web app
* /websocket-monitor.html - Dev. tool for monitoring websockets communications

__HTTP API__

* /hashtags/:hashtag/minute/ – Get the number of occurances of a `hashtag` per minutes for every minute in the last 120 minutes
* /hashtags/:hashtag/hour/ – Get the number of occurances of a `hashtag` per hour for every hour in the last 120 hours
* /hashtags/:hashtag/day/ – Get the number of occurances of a `hashtag` per day for every day in the last 120 days
* /hashtags/:hashtag/week/ – Get the number of occurances of a `hashtag` per week for every week in the last 120 week

### Dev webpages

* /mock-tweets-system.html – Creation and triggering of fake tweets

__Dev HTTP API__

* /api/mock-tweet-list/ – Returns all the mock tweets
* /api/mock-tweet-list/triggered/ – Returns the last triggered mock tweets (__will clear this list of triggered tweets, so only one person can use it at a time__)

## Notes

Doesn't run direction from `app.feellondon.js`, needs to be encapsulated within a bash (or other script). E.g.:

__script-run.sh__

````bash
#!/bin/sh
TWITTER_SCREENNAME= \
CONSUMER_KEY= \
CONSUMER_SECRET= \
ACCESS_TOKEN_KEY= \
ACCESS_TOKEN_SECRET= \
node app.feellondon.js 
````
## Protocol

### Announcements

#### Shoutout

    {
        "resource": "/shoutout/new/",
        "body": {
            "tweet": {
                "id": 385037439565561860,
                "text": "@1948dev #shoutout 123421342134123412341234",
                "inReplyToId": 1732263122,
                "inReplyToName": "1948dev",
                "userId": 250881376,
                "userName": "The Worker",
                "userScreenName": "sputnik_w",
                "createdAt": 1380635053000,
                "hashTags": [
                    {
                        "text": "shoutout",
                        "indices": [
                            9,
                            18
                        ]
                    }
                ],
                "userMentions": [
                    {
                        "screen_name": "1948dev",
                        "name": "Ross Cairns",
                        "id": 1732263122,
                        "id_str": "1732263122",
                        "indices": [
                            0,
                            8
                        ]
                    }
                ]
            }
        }
    }

#### Command

Sample:

    {
        "resource": "/command/new/",
        "body": {
            "tweet": {
                "id": 384984189629919200,
                "text": "@1948dev glitch it",
                "inReplyToId": 1732263122,
                "inReplyToName": "1948dev",
                "userId": 250881376,
                "userName": "The Worker",
                "userScreenName": "sputnik_w",
                "createdAt": 1380622358000,
                "hashTags": [],
                "userMentions": [
                    {
                        "screen_name": "1948dev",
                        "name": "Ross Cairns",
                        "id": 1732263122,
                        "id_str": "1732263122",
                        "indices": [
                            0,
                            8
                        ]
                    }
                ]
            },
            "payload": {
                "effects": [
                    {
                        "name": "scanlines",
                        "uniforms": [
                            {
                                "nIntensity": 0.8863080143928528
                            }
                        ]
                    }
                ],
                "payloadname": "Glitch"
            }
        }
    }

### Requests

Get a count of hash tags

    {
        "resource" : "/hashtags/:tag/:resolution/",
        "token" : ":token"
    }
