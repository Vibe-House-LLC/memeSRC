import { NextResponse } from 'next/server';

export async function GET() {
  // Simulate a 2-second delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // This is where you'd normally fetch data from a database or external API
  const searchIndexes = [
    {
        "id": "thebiglebowski",
        "createdAt": "2024-03-17T21:56:09.156Z",
        "updatedAt": "2024-03-17T21:56:09.156Z",
        "aliasV2ContentMetadataId": "thebiglebowski",
        "v2ContentMetadata": {
            "colorMain": "#F2AE43",
            "colorSecondary": "#040809",
            "createdAt": "2024-03-09T13:23:46.062Z",
            "description": "The Big Lebowski",
            "emoji": "🎳",
            "frameCount": 70150,
            "title": "The Big Lebowski",
            "updatedAt": "2024-03-09T13:23:46.062Z",
            "status": 0,
            "id": "thebiglebowski",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "breakingbad",
        "createdAt": "2024-03-17T21:56:14.246Z",
        "updatedAt": "2024-03-17T21:56:14.246Z",
        "aliasV2ContentMetadataId": "breakingbad",
        "v2ContentMetadata": {
            "colorMain": "#003300",
            "colorSecondary": "#ffffcc",
            "createdAt": "2024-03-12T02:43:42.790Z",
            "description": "Breaking Bad",
            "emoji": "🧪",
            "frameCount": 1772200,
            "title": "Breaking Bad",
            "updatedAt": "2024-03-12T02:43:42.790Z",
            "status": 0,
            "id": "breakingbad",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "blazingsaddles",
        "createdAt": "2024-03-17T21:56:31.682Z",
        "updatedAt": "2024-03-17T21:56:31.682Z",
        "aliasV2ContentMetadataId": "blazingsaddles",
        "v2ContentMetadata": {
            "colorMain": "#EDE6DC",
            "colorSecondary": "#B1072B",
            "createdAt": "2024-03-09T08:03:26.685Z",
            "description": "Blazing Saddles",
            "emoji": "🤠",
            "frameCount": 50100,
            "title": "Blazing Saddles",
            "updatedAt": "2024-03-09T08:03:26.685Z",
            "status": 0,
            "id": "blazingsaddles",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "lotr",
        "createdAt": "2024-03-23T01:56:35.222Z",
        "updatedAt": "2024-03-23T01:56:35.222Z",
        "aliasV2ContentMetadataId": "lotr",
        "v2ContentMetadata": {
            "colorMain": "#644938",
            "colorSecondary": "#eaad3e",
            "createdAt": "2024-03-23T01:49:47.035Z",
            "description": "The Lord of the Rings",
            "emoji": "⚔️",
            "frameCount": 435600,
            "title": "The Lord of the Rings",
            "updatedAt": "2024-03-23T01:49:47.035Z",
            "status": 0,
            "id": "lotr",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "kingofqueens",
        "createdAt": "2024-03-17T22:07:06.975Z",
        "updatedAt": "2024-03-17T22:07:06.975Z",
        "aliasV2ContentMetadataId": "kingofqueens",
        "v2ContentMetadata": {
            "colorMain": "#375e3b",
            "colorSecondary": "#FFF",
            "createdAt": "2024-03-14T21:28:41.818Z",
            "description": "The King of Queens",
            "emoji": "🚛",
            "frameCount": 2750000,
            "title": "The King of Queens",
            "updatedAt": "2024-03-14T21:28:41.818Z",
            "status": 0,
            "id": "kingofqueens",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "twilight",
        "createdAt": "2024-08-31T15:36:03.781Z",
        "updatedAt": "2024-08-31T15:36:03.781Z",
        "aliasV2ContentMetadataId": "twilight",
        "v2ContentMetadata": {
            "colorMain": "#284662",
            "colorSecondary": "#f6b444",
            "createdAt": "2024-08-31T15:36:04.049Z",
            "description": "N/A",
            "emoji": "🐺",
            "frameCount": 365760,
            "title": "twilight",
            "updatedAt": "2024-08-31T15:36:04.049Z",
            "status": 0,
            "id": "twilight",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "simpsons",
        "createdAt": "2024-05-04T06:44:07.216Z",
        "updatedAt": "2024-05-04T06:44:07.216Z",
        "aliasV2ContentMetadataId": "simpsons",
        "v2ContentMetadata": {
            "colorMain": "#61AFE0",
            "colorSecondary": "#F7D629",
            "createdAt": "2024-05-04T03:14:20.453Z",
            "description": "The Simpsons",
            "emoji": "🍩",
            "frameCount": 5874000,
            "title": "The Simpsons",
            "updatedAt": "2024-05-04T15:26:49.958Z",
            "status": 0,
            "id": "simpsons",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "fotc",
        "createdAt": "2024-03-17T21:56:43.394Z",
        "updatedAt": "2024-03-17T21:56:43.394Z",
        "aliasV2ContentMetadataId": "fotc",
        "v2ContentMetadata": {
            "colorMain": "#87c3d9",
            "colorSecondary": "#f4f100",
            "createdAt": "2024-03-09T18:01:34.906Z",
            "description": "Flight of the Conchords",
            "emoji": "🎸",
            "frameCount": 360000,
            "title": "Flight of the Conchords",
            "updatedAt": "2024-03-09T18:01:34.906Z",
            "status": 0,
            "id": "fotc",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "scrubs",
        "createdAt": "2024-08-30T13:14:55.429Z",
        "updatedAt": "2024-08-30T13:14:55.429Z",
        "aliasV2ContentMetadataId": "scrubs",
        "v2ContentMetadata": {
            "colorMain": "#75a0d4",
            "colorSecondary": "#FFFFFF",
            "createdAt": "2024-08-30T13:14:55.572Z",
            "description": "N/A",
            "emoji": "🥼",
            "frameCount": 2426580,
            "title": "scrubs",
            "updatedAt": "2024-08-30T13:53:36.722Z",
            "status": 0,
            "id": "scrubs",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "sopranos",
        "createdAt": "2024-03-17T21:56:52.355Z",
        "updatedAt": "2024-03-17T21:56:52.355Z",
        "aliasV2ContentMetadataId": "sopranos",
        "v2ContentMetadata": {
            "colorMain": "#FFF",
            "colorSecondary": "#eb3440",
            "createdAt": "2024-03-16T22:30:19.835Z",
            "description": "The Sopranos",
            "emoji": "🍕",
            "frameCount": 2787700,
            "title": "The Sopranos",
            "updatedAt": "2024-03-16T22:30:19.835Z",
            "status": 0,
            "id": "sopranos",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "seinfeld",
        "createdAt": "2024-03-17T21:56:56.660Z",
        "updatedAt": "2024-03-17T21:56:56.660Z",
        "aliasV2ContentMetadataId": "seinfeld",
        "v2ContentMetadata": {
            "colorMain": "#ffcf00",
            "colorSecondary": "#ff0000",
            "createdAt": "2024-03-09T21:01:47.987Z",
            "description": "Seinfeld",
            "emoji": "🥨",
            "frameCount": 2550000,
            "title": "Seinfeld",
            "updatedAt": "2024-03-09T21:01:47.987Z",
            "status": 0,
            "id": "seinfeld",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "officespace",
        "createdAt": "2024-03-18T00:04:14.498Z",
        "updatedAt": "2024-03-18T00:04:14.498Z",
        "aliasV2ContentMetadataId": "officespace",
        "v2ContentMetadata": {
            "colorMain": "#EEE7DD",
            "colorSecondary": "#D91E49",
            "createdAt": "2024-03-18T00:04:14.228Z",
            "description": "Office Space",
            "emoji": "🖨",
            "frameCount": 53500,
            "title": "Office Space",
            "updatedAt": "2024-03-18T00:04:14.228Z",
            "status": 0,
            "id": "officespace",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "spaceballs",
        "createdAt": "2024-03-22T01:03:34.045Z",
        "updatedAt": "2024-03-22T01:03:34.045Z",
        "aliasV2ContentMetadataId": "spaceballs",
        "v2ContentMetadata": {
            "colorMain": "#40100C",
            "colorSecondary": "#FDF9F6",
            "createdAt": "2024-03-22T01:03:33.511Z",
            "description": "Spaceballs",
            "emoji": "☄️",
            "frameCount": 57700,
            "title": "Spaceballs",
            "updatedAt": "2024-03-22T01:03:33.511Z",
            "status": 0,
            "id": "spaceballs",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "sunny",
        "createdAt": "2024-03-17T21:57:02.458Z",
        "updatedAt": "2024-03-17T21:57:02.458Z",
        "aliasV2ContentMetadataId": "sunny",
        "v2ContentMetadata": {
            "colorMain": "#ffde00",
            "colorSecondary": "#000",
            "createdAt": "2024-03-17T14:42:36.222Z",
            "description": "It's Always Sunny in Philadelphia",
            "emoji": "☀️",
            "frameCount": 1837700,
            "title": "It's Always Sunny in Philadelphia",
            "updatedAt": "2024-03-17T14:42:36.222Z",
            "status": 0,
            "id": "sunny",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "peepshow",
        "createdAt": "2024-08-28T02:07:38.598Z",
        "updatedAt": "2024-08-28T02:07:38.598Z",
        "aliasV2ContentMetadataId": "peepshow",
        "v2ContentMetadata": {
            "colorMain": "#0e2c12",
            "colorSecondary": "#FFFFFF",
            "createdAt": "2024-08-28T02:07:39.149Z",
            "description": "N/A",
            "emoji": "👁️‍🗨️",
            "frameCount": 751680,
            "title": "Peep Show",
            "updatedAt": "2024-08-28T02:07:39.149Z",
            "status": 0,
            "id": "peepshow",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "strangerthings",
        "createdAt": "2024-08-27T20:02:25.991Z",
        "updatedAt": "2024-08-27T20:02:25.991Z",
        "aliasV2ContentMetadataId": "strangerthings",
        "v2ContentMetadata": {
            "colorMain": "#000000",
            "colorSecondary": "#9e3230",
            "createdAt": "2024-08-27T20:02:26.398Z",
            "description": "N/A",
            "emoji": "👾",
            "frameCount": 1246750,
            "title": "STRANGER THINGS",
            "updatedAt": "2024-08-27T21:29:19.728Z",
            "status": 0,
            "id": "strangerthings",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "parksandrecreation",
        "createdAt": "2024-03-17T21:57:09.247Z",
        "updatedAt": "2024-03-17T21:57:09.247Z",
        "aliasV2ContentMetadataId": "parksandrecreation",
        "v2ContentMetadata": {
            "colorMain": "#48b138",
            "colorSecondary": "#f9f9f9",
            "createdAt": "2024-03-16T04:58:54.416Z",
            "description": "Parks and Recreation",
            "emoji": "🌳",
            "frameCount": 1274400,
            "title": "Parks and Recreation",
            "updatedAt": "2024-03-16T04:58:54.416Z",
            "status": 0,
            "id": "parksandrecreation",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "arresteddevelopment",
        "createdAt": "2024-03-18T02:45:08.014Z",
        "updatedAt": "2024-03-18T02:45:08.014Z",
        "aliasV2ContentMetadataId": "arresteddevelopment",
        "v2ContentMetadata": {
            "colorMain": "#e2e2e2",
            "colorSecondary": "#d86435",
            "createdAt": "2024-03-18T02:45:07.701Z",
            "description": "Arrested Development",
            "emoji": "🏚️",
            "frameCount": 1114400,
            "title": "Arrested Development",
            "updatedAt": "2024-03-18T02:45:07.701Z",
            "status": 0,
            "id": "arresteddevelopment",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "mib",
        "createdAt": "2024-09-06T15:07:07.069Z",
        "updatedAt": "2024-09-06T15:07:07.069Z",
        "aliasV2ContentMetadataId": "mib",
        "v2ContentMetadata": {
            "colorMain": "#000000",
            "colorSecondary": "#FFFFFF",
            "createdAt": "2024-09-06T15:07:07.256Z",
            "description": "N/A",
            "emoji": "😎",
            "frameCount": 61200,
            "title": "MEN IN BLACK",
            "updatedAt": "2024-09-06T15:39:46.438Z",
            "status": 0,
            "id": "mib",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "wwdits",
        "createdAt": "2024-03-22T01:06:47.492Z",
        "updatedAt": "2024-03-22T01:06:47.492Z",
        "aliasV2ContentMetadataId": "wwdits",
        "v2ContentMetadata": {
            "colorMain": "#0f0f11",
            "colorSecondary": "#e2004a",
            "createdAt": "2024-03-22T01:06:47.027Z",
            "description": "What We Do in the Shadows",
            "emoji": "🦇",
            "frameCount": 596600,
            "title": "What We Do in the Shadows",
            "updatedAt": "2024-03-22T01:06:47.027Z",
            "status": 0,
            "id": "wwdits",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "trailerparkboys",
        "createdAt": "2024-03-17T22:17:06.320Z",
        "updatedAt": "2024-03-17T22:17:06.320Z",
        "aliasV2ContentMetadataId": "trailerparkboys",
        "v2ContentMetadata": {
            "colorMain": "#8fecff",
            "colorSecondary": "#c2101f",
            "createdAt": "2024-03-17T22:17:06.053Z",
            "description": "Trailer Park Boys",
            "emoji": "🏚️",
            "frameCount": 750000,
            "title": "Trailer Park Boys",
            "updatedAt": "2024-03-17T22:17:06.053Z",
            "status": 0,
            "id": "trailerparkboys",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "gemstones",
        "createdAt": "2024-04-05T22:51:49.792Z",
        "updatedAt": "2024-04-05T22:51:49.792Z",
        "aliasV2ContentMetadataId": "gemstones",
        "v2ContentMetadata": {
            "colorMain": "#FEF5F8",
            "colorSecondary": "#272151",
            "createdAt": "2024-04-05T22:51:49.284Z",
            "description": "The Righteous Gemstones",
            "emoji": "🙏🏻",
            "frameCount": 567000,
            "title": "The Righteous Gemstones",
            "updatedAt": "2024-04-05T22:51:49.284Z",
            "status": 0,
            "id": "gemstones",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "seinfeld43",
        "createdAt": "2024-03-17T21:57:23.494Z",
        "updatedAt": "2024-03-17T21:57:23.494Z",
        "aliasV2ContentMetadataId": "seinfeld43",
        "v2ContentMetadata": {
            "colorMain": "#ffcf00",
            "colorSecondary": "#ff0000",
            "createdAt": "2024-03-08T04:23:52.840Z",
            "description": "Seinfeld 4:3",
            "emoji": "📺",
            "frameCount": 2550000,
            "title": "Seinfeld 4:3",
            "updatedAt": "2024-03-08T04:23:52.840Z",
            "status": 0,
            "id": "seinfeld43",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "community",
        "createdAt": "2024-03-17T21:57:28.201Z",
        "updatedAt": "2024-03-17T21:57:28.201Z",
        "aliasV2ContentMetadataId": "community",
        "v2ContentMetadata": {
            "colorMain": "#FFF",
            "colorSecondary": "#003399",
            "createdAt": "2024-03-11T02:46:13.717Z",
            "description": "Community",
            "emoji": "🎓",
            "frameCount": 1454400,
            "title": "Community",
            "updatedAt": "2024-03-11T02:46:13.717Z",
            "status": 0,
            "id": "community",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "malcolminthemiddle",
        "createdAt": "2024-08-29T20:53:15.681Z",
        "updatedAt": "2024-08-29T20:53:15.681Z",
        "aliasV2ContentMetadataId": "malcolminthemiddle",
        "v2ContentMetadata": {
            "colorMain": "#FFFFFF",
            "colorSecondary": "#000000",
            "createdAt": "2024-08-29T20:47:01.165Z",
            "description": "N/A",
            "emoji": "🧑‍🧑‍🧒",
            "frameCount": 1940750,
            "title": "Malcolm in the Middle",
            "updatedAt": "2024-08-29T20:47:01.165Z",
            "status": 0,
            "id": "malcolminthemiddle",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "bobsburgers",
        "createdAt": "2024-04-07T02:50:10.131Z",
        "updatedAt": "2024-04-07T02:50:10.131Z",
        "aliasV2ContentMetadataId": "bobsburgers",
        "v2ContentMetadata": {
            "colorMain": "#F2ED0B",
            "colorSecondary": "#FF0220",
            "createdAt": "2024-04-07T02:50:09.718Z",
            "description": "Bob's Burgers",
            "emoji": "🍔",
            "frameCount": 3722400,
            "title": "Bob's Burgers",
            "updatedAt": "2024-04-07T02:50:09.718Z",
            "status": 0,
            "id": "bobsburgers",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "indianajones",
        "createdAt": "2024-08-28T16:42:38.404Z",
        "updatedAt": "2024-08-28T16:42:38.404Z",
        "aliasV2ContentMetadataId": "indianajones",
        "v2ContentMetadata": {
            "colorMain": "#c06123",
            "colorSecondary": "#f9db03",
            "createdAt": "2024-08-28T16:42:38.993Z",
            "description": "N/A",
            "emoji": "🤠",
            "frameCount": 306000,
            "title": "Indiana Jones",
            "updatedAt": "2024-08-28T16:42:38.993Z",
            "status": 0,
            "id": "indianajones",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "theofficeus",
        "createdAt": "2024-03-17T21:57:33.036Z",
        "updatedAt": "2024-03-17T21:57:33.036Z",
        "aliasV2ContentMetadataId": "theofficeus",
        "v2ContentMetadata": {
            "colorMain": "black",
            "colorSecondary": "white",
            "createdAt": "2024-03-14T01:30:44.808Z",
            "description": "The Office (US)",
            "emoji": "🏢",
            "frameCount": 2721100,
            "title": "The Office (US)",
            "updatedAt": "2024-03-14T01:30:44.808Z",
            "status": 0,
            "id": "theofficeus",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "frasier",
        "createdAt": "2024-03-17T21:57:40.951Z",
        "updatedAt": "2024-03-17T21:57:40.951Z",
        "aliasV2ContentMetadataId": "frasier",
        "v2ContentMetadata": {
            "colorMain": "#120404",
            "colorSecondary": "#ffffff",
            "createdAt": "2024-03-11T23:53:35.861Z",
            "description": "Frasier",
            "emoji": "🍳",
            "frameCount": 3532200,
            "title": "Frasier",
            "updatedAt": "2024-03-11T23:53:35.861Z",
            "status": 0,
            "id": "frasier",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "spiderman",
        "createdAt": "2024-08-27T02:03:24.017Z",
        "updatedAt": "2024-08-27T02:03:24.017Z",
        "aliasV2ContentMetadataId": "spiderman",
        "v2ContentMetadata": {
            "colorMain": "#ec1b23",
            "colorSecondary": "#000000",
            "createdAt": "2024-08-27T02:03:24.177Z",
            "description": "N/A",
            "emoji": "🕸️",
            "frameCount": 235800,
            "title": "SPIDER-MAN",
            "updatedAt": "2024-08-27T21:27:05.646Z",
            "status": 0,
            "id": "spiderman",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "starwars",
        "createdAt": "2024-08-28T03:01:21.406Z",
        "updatedAt": "2024-08-28T03:01:21.406Z",
        "aliasV2ContentMetadataId": "starwars",
        "v2ContentMetadata": {
            "colorMain": "#2C2C2C",
            "colorSecondary": "#FFE81F",
            "createdAt": "2024-08-28T03:01:21.631Z",
            "description": "N/A",
            "emoji": "🔦",
            "frameCount": 325800,
            "title": "Star Wars",
            "updatedAt": "2024-08-28T03:02:26.430Z",
            "status": 0,
            "id": "starwars",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "ithinkyoushouldleave",
        "createdAt": "2024-03-17T21:57:45.197Z",
        "updatedAt": "2024-03-17T21:57:45.197Z",
        "aliasV2ContentMetadataId": "ithinkyoushouldleave",
        "v2ContentMetadata": {
            "colorMain": "#565873",
            "colorSecondary": "#FFF",
            "createdAt": "2024-03-11T16:43:44.179Z",
            "description": "I Think You Should Leave",
            "emoji": "🚪",
            "frameCount": 121100,
            "title": "I Think You Should Leave",
            "updatedAt": "2024-03-11T16:43:44.179Z",
            "status": 0,
            "id": "ithinkyoushouldleave",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "supernatural",
        "createdAt": "2024-03-17T21:57:53.533Z",
        "updatedAt": "2024-03-17T21:57:53.533Z",
        "aliasV2ContentMetadataId": "supernatural",
        "v2ContentMetadata": {
            "colorMain": "#f6f483",
            "colorSecondary": "#36180e",
            "createdAt": "2024-03-10T14:38:38.207Z",
            "description": "Supernatural",
            "emoji": "🔪",
            "frameCount": 8231100,
            "title": "Supernatural",
            "updatedAt": "2024-03-10T14:38:38.207Z",
            "status": 0,
            "id": "supernatural",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "futurama",
        "createdAt": "2024-04-06T20:16:56.771Z",
        "updatedAt": "2024-04-06T20:16:56.771Z",
        "aliasV2ContentMetadataId": "futurama",
        "v2ContentMetadata": {
            "colorMain": "#13212A",
            "colorSecondary": "#B62719",
            "createdAt": "2024-04-06T20:16:56.472Z",
            "description": "Futurama",
            "emoji": "🚀",
            "frameCount": 2000000,
            "title": "Futurama",
            "updatedAt": "2024-05-02T15:07:58.395Z",
            "status": 0,
            "id": "futurama",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "brooklynninenine",
        "createdAt": "2024-03-17T21:57:59.304Z",
        "updatedAt": "2024-03-17T21:57:59.304Z",
        "aliasV2ContentMetadataId": "brooklynninenine",
        "v2ContentMetadata": {
            "colorMain": "#59868d",
            "colorSecondary": "#fee42e",
            "createdAt": "2024-03-11T13:55:36.866Z",
            "description": "Brooklyn Nine-Nine",
            "emoji": "🚔",
            "frameCount": 1980000,
            "title": "Brooklyn Nine-Nine",
            "updatedAt": "2024-03-11T13:55:36.866Z",
            "status": 0,
            "id": "brooklynninenine",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "pulpfiction",
        "createdAt": "2024-08-30T16:33:49.759Z",
        "updatedAt": "2024-08-30T16:33:49.759Z",
        "aliasV2ContentMetadataId": "pulpfiction",
        "v2ContentMetadata": {
            "colorMain": "#b4272f",
            "colorSecondary": "#ecb731",
            "createdAt": "2024-08-30T16:33:49.985Z",
            "description": "N/A",
            "emoji": "💉",
            "frameCount": 90000,
            "title": "PULP FICTION",
            "updatedAt": "2024-08-30T16:51:09.725Z",
            "status": 0,
            "id": "pulpfiction",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "airplane",
        "createdAt": "2024-03-19T14:33:13.407Z",
        "updatedAt": "2024-03-19T14:33:13.407Z",
        "aliasV2ContentMetadataId": "airplane",
        "v2ContentMetadata": {
            "colorMain": "#89B1CB",
            "colorSecondary": "#BD0004",
            "createdAt": "2024-03-19T14:33:13.126Z",
            "description": "Airplane!",
            "emoji": "✈️",
            "frameCount": 52200,
            "title": "Airplane!",
            "updatedAt": "2024-03-19T14:33:13.126Z",
            "status": 0,
            "id": "airplane",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "athf",
        "createdAt": "2024-03-17T21:58:04.939Z",
        "updatedAt": "2024-03-17T21:58:04.939Z",
        "aliasV2ContentMetadataId": "athf",
        "v2ContentMetadata": {
            "colorMain": "#d10b36",
            "colorSecondary": "#f7e401",
            "createdAt": "2024-03-15T16:28:12.290Z",
            "description": "Aqua Teen Hunger Force",
            "emoji": "🥤",
            "frameCount": 962200,
            "title": "Aqua Teen Hunger Force",
            "updatedAt": "2024-03-15T16:28:12.290Z",
            "status": 0,
            "id": "athf",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "holygrail",
        "createdAt": "2024-08-27T02:44:49.952Z",
        "updatedAt": "2024-08-27T02:44:49.952Z",
        "aliasV2ContentMetadataId": "holygrail",
        "v2ContentMetadata": {
            "colorMain": "#3c90e6",
            "colorSecondary": "#fdbd2d",
            "createdAt": "2024-08-27T02:44:50.264Z",
            "description": "N/A",
            "emoji": "🏆",
            "frameCount": 54000,
            "title": "Monty Python and the Holy Grail",
            "updatedAt": "2024-08-27T02:44:50.264Z",
            "status": 0,
            "id": "holygrail",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "ghostbusters",
        "createdAt": "2024-08-31T17:00:17.744Z",
        "updatedAt": "2024-08-31T17:00:17.744Z",
        "aliasV2ContentMetadataId": "ghostbusters",
        "v2ContentMetadata": {
            "colorMain": "#F8F8F8",
            "colorSecondary": "#000000",
            "createdAt": "2024-08-31T17:00:18.043Z",
            "description": "N/A",
            "emoji": "👻",
            "frameCount": 126000,
            "title": "GHOSTBUSTERS",
            "updatedAt": "2024-08-31T17:00:18.043Z",
            "status": 0,
            "id": "ghostbusters",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "diehard",
        "createdAt": "2024-03-18T00:03:56.547Z",
        "updatedAt": "2024-03-18T00:03:56.547Z",
        "aliasV2ContentMetadataId": "diehard",
        "v2ContentMetadata": {
            "colorMain": "#040404",
            "colorSecondary": "#E90216",
            "createdAt": "2024-03-18T00:03:56.296Z",
            "description": "Die Hard",
            "emoji": "🌇",
            "frameCount": 79200,
            "title": "Die Hard",
            "updatedAt": "2024-03-18T00:03:56.296Z",
            "status": 0,
            "id": "diehard",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "bettercallsaul",
        "createdAt": "2024-03-17T21:58:17.622Z",
        "updatedAt": "2024-03-17T21:58:17.622Z",
        "aliasV2ContentMetadataId": "bettercallsaul",
        "v2ContentMetadata": {
            "colorMain": "#F8DD68",
            "colorSecondary": "#BE3334",
            "createdAt": "2024-03-14T17:53:15.210Z",
            "description": "Better Call Saul",
            "emoji": "📞",
            "frameCount": 1893300,
            "title": "Better Call Saul",
            "updatedAt": "2024-03-14T17:53:15.210Z",
            "status": 0,
            "id": "bettercallsaul",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "koth",
        "createdAt": "2024-03-17T21:58:22.116Z",
        "updatedAt": "2024-03-17T21:58:22.116Z",
        "aliasV2ContentMetadataId": "koth",
        "v2ContentMetadata": {
            "colorMain": "#72b8d4",
            "colorSecondary": "#e32428",
            "createdAt": "2024-03-15T03:25:20.613Z",
            "description": "King of the Hill",
            "emoji": "🥩",
            "frameCount": 3464400,
            "title": "King of the Hill",
            "updatedAt": "2024-03-15T03:25:20.613Z",
            "status": 0,
            "id": "koth",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "matrix",
        "createdAt": "2024-03-17T21:51:34.409Z",
        "updatedAt": "2024-03-17T21:51:34.409Z",
        "aliasV2ContentMetadataId": "matrix",
        "v2ContentMetadata": {
            "colorMain": "#0D0208",
            "colorSecondary": "#00FF41",
            "createdAt": "2024-03-14T01:23:06.960Z",
            "description": "The Matrix",
            "emoji": "🕶️",
            "frameCount": 73600,
            "title": "The Matrix",
            "updatedAt": "2024-03-14T01:23:06.960Z",
            "status": 0,
            "id": "matrix",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "therehearsal",
        "createdAt": "2024-03-17T21:58:32.142Z",
        "updatedAt": "2024-03-17T21:58:32.142Z",
        "aliasV2ContentMetadataId": "therehearsal",
        "v2ContentMetadata": {
            "colorMain": "#BFBCAB",
            "colorSecondary": "#3B5240",
            "createdAt": "2024-03-11T02:20:12.248Z",
            "description": "The Rehearsal",
            "emoji": "🎭",
            "frameCount": 117700,
            "title": "The Rehearsal",
            "updatedAt": "2024-03-11T02:20:12.248Z",
            "status": 0,
            "id": "therehearsal",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "itcrowd",
        "createdAt": "2024-03-18T00:04:06.457Z",
        "updatedAt": "2024-03-18T00:04:06.457Z",
        "aliasV2ContentMetadataId": "itcrowd",
        "v2ContentMetadata": {
            "colorMain": "#5c290c",
            "colorSecondary": "#f88005",
            "createdAt": "2024-03-18T00:04:06.205Z",
            "description": "The IT Crowd",
            "emoji": "💻",
            "frameCount": 337698,
            "title": "The IT Crowd",
            "updatedAt": "2024-03-18T00:04:06.205Z",
            "status": 0,
            "id": "itcrowd",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "freaksandgeeks",
        "createdAt": "2024-03-17T21:58:37.827Z",
        "updatedAt": "2024-03-17T21:58:37.827Z",
        "aliasV2ContentMetadataId": "freaksandgeeks",
        "v2ContentMetadata": {
            "colorMain": "#565751",
            "colorSecondary": "#fdfbf9",
            "createdAt": "2024-03-11T01:20:07.697Z",
            "description": "Freaks and Geeks",
            "emoji": "🎒",
            "frameCount": 478800,
            "title": "Freaks and Geeks",
            "updatedAt": "2024-03-11T01:20:07.697Z",
            "status": 0,
            "id": "freaksandgeeks",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "backtothefuture",
        "createdAt": "2024-04-24T04:05:13.033Z",
        "updatedAt": "2024-04-24T04:05:13.033Z",
        "aliasV2ContentMetadataId": "backtothefuture",
        "v2ContentMetadata": {
            "colorMain": "#0B1B35",
            "colorSecondary": "#E32223",
            "createdAt": "2024-04-24T04:05:13.459Z",
            "description": "Back to the Future",
            "emoji": "🕙",
            "frameCount": 69000,
            "title": "Back to the Future",
            "updatedAt": "2024-04-24T04:05:13.459Z",
            "status": 0,
            "id": "backtothefuture",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "fatherted",
        "createdAt": "2024-09-06T17:46:48.406Z",
        "updatedAt": "2024-09-06T17:46:48.406Z",
        "aliasV2ContentMetadataId": "fatherted",
        "v2ContentMetadata": {
            "colorMain": "#82a11d",
            "colorSecondary": "#c61b00",
            "createdAt": "2024-09-06T17:46:48.987Z",
            "description": "N/A",
            "emoji": "✝️",
            "frameCount": 360000,
            "title": "Father Ted",
            "updatedAt": "2024-09-06T17:46:48.987Z",
            "status": 0,
            "id": "fatherted",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "squidgame",
        "createdAt": "2024-03-17T21:58:50.175Z",
        "updatedAt": "2024-03-17T21:58:50.175Z",
        "aliasV2ContentMetadataId": "squidgame",
        "v2ContentMetadata": {
            "colorMain": "#d046a1",
            "colorSecondary": "white",
            "createdAt": "2024-03-08T01:15:32.301Z",
            "description": "Squid Game",
            "emoji": "🐙",
            "frameCount": 264645,
            "title": "Squid Game",
            "updatedAt": "2024-03-08T01:15:32.301Z",
            "status": 0,
            "id": "squidgame",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "timanderic",
        "createdAt": "2024-03-17T21:59:02.310Z",
        "updatedAt": "2024-03-17T21:59:02.310Z",
        "aliasV2ContentMetadataId": "timanderic",
        "v2ContentMetadata": {
            "colorMain": "#ff00fe",
            "colorSecondary": "#ebfb4b",
            "createdAt": "2024-03-14T01:57:51.689Z",
            "description": "Tim and Eric Awesome Show, Great Job!",
            "emoji": "🤡",
            "frameCount": 347700,
            "title": "Tim and Eric Awesome Show, Great Job!",
            "updatedAt": "2024-03-14T01:57:51.689Z",
            "status": 0,
            "id": "timanderic",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "schittscreek",
        "createdAt": "2024-03-17T21:59:07.559Z",
        "updatedAt": "2024-03-17T21:59:07.559Z",
        "aliasV2ContentMetadataId": "schittscreek",
        "v2ContentMetadata": {
            "colorMain": "#181416",
            "colorSecondary": "#fec12d",
            "createdAt": "2024-03-16T22:32:14.480Z",
            "description": "Schitts Creek",
            "emoji": "💲",
            "frameCount": 1040000,
            "title": "Schitts Creek",
            "updatedAt": "2024-03-16T22:32:14.480Z",
            "status": 0,
            "id": "schittscreek",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "theprincessbride",
        "createdAt": "2024-03-18T00:04:21.793Z",
        "updatedAt": "2024-03-18T00:04:21.793Z",
        "aliasV2ContentMetadataId": "theprincessbride",
        "v2ContentMetadata": {
            "colorMain": "#5BBCFF",
            "colorSecondary": "#E7E9F5",
            "createdAt": "2024-03-18T00:04:21.556Z",
            "description": "The Princess Bride",
            "emoji": "👑",
            "frameCount": 59100,
            "title": "The Princess Bride",
            "updatedAt": "2024-03-18T00:04:21.556Z",
            "status": 0,
            "id": "theprincessbride",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "curbyourenthusiasm",
        "createdAt": "2024-03-17T21:59:18.234Z",
        "updatedAt": "2024-03-17T21:59:18.234Z",
        "aliasV2ContentMetadataId": "curbyourenthusiasm",
        "v2ContentMetadata": {
            "colorMain": "#ffc700",
            "colorSecondary": "#000",
            "createdAt": "2024-03-08T20:20:42.343Z",
            "description": "Curb Your Enthusiasm",
            "emoji": "🤦‍♂️",
            "frameCount": 2157500,
            "title": "Curb Your Enthusiasm",
            "updatedAt": "2024-03-08T20:20:42.343Z",
            "status": 0,
            "id": "curbyourenthusiasm",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "30rock",
        "createdAt": "2024-03-17T21:59:23.615Z",
        "updatedAt": "2024-03-17T21:59:23.615Z",
        "aliasV2ContentMetadataId": "30rock",
        "v2ContentMetadata": {
            "colorMain": "black",
            "colorSecondary": "white",
            "createdAt": "2024-03-11T02:46:21.948Z",
            "description": "30 Rock",
            "emoji": "🏢",
            "frameCount": 1783000,
            "title": "30 Rock",
            "updatedAt": "2024-03-11T02:46:21.948Z",
            "status": 0,
            "id": "30rock",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "southpark",
        "createdAt": "2024-08-31T21:17:21.390Z",
        "updatedAt": "2024-08-31T21:17:21.390Z",
        "aliasV2ContentMetadataId": "southpark",
        "v2ContentMetadata": {
            "colorMain": "#45b0b6",
            "colorSecondary": "#f6c60c",
            "createdAt": "2024-08-31T21:17:21.650Z",
            "description": "N/A",
            "emoji": "🪧",
            "frameCount": 5000000,
            "title": "South Park",
            "updatedAt": "2024-08-31T21:17:21.650Z",
            "status": 0,
            "id": "southpark",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "thegoodplace",
        "createdAt": "2024-03-17T21:59:28.384Z",
        "updatedAt": "2024-03-17T21:59:28.384Z",
        "aliasV2ContentMetadataId": "thegoodplace",
        "v2ContentMetadata": {
            "colorMain": "#ffce56",
            "colorSecondary": "#508ab9",
            "createdAt": "2024-03-15T17:29:14.439Z",
            "description": "The Good Place",
            "emoji": "😇",
            "frameCount": 718800,
            "title": "The Good Place",
            "updatedAt": "2024-03-15T17:29:14.439Z",
            "status": 0,
            "id": "thegoodplace",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "mash",
        "createdAt": "2024-03-21T19:49:57.912Z",
        "updatedAt": "2024-03-21T19:49:57.912Z",
        "aliasV2ContentMetadataId": "mash",
        "v2ContentMetadata": {
            "colorMain": "#f6f4e5",
            "colorSecondary": "#536f32",
            "createdAt": "2024-03-19T13:34:53.495Z",
            "description": "M*A*S*H",
            "emoji": "🏥",
            "frameCount": 3904400,
            "title": "M*A*S*H",
            "updatedAt": "2024-05-04T03:51:51.456Z",
            "status": 0,
            "id": "mash",
            "version": 2
        },
        "__typename": "Alias"
    },
    {
        "id": "nathanforyou",
        "createdAt": "2024-03-22T01:06:20.479Z",
        "updatedAt": "2024-03-22T01:06:20.479Z",
        "aliasV2ContentMetadataId": "nathanforyou",
        "v2ContentMetadata": {
            "colorMain": "#FFF",
            "colorSecondary": "#508ab9",
            "createdAt": "2024-03-22T01:06:20.188Z",
            "description": "Nathan for You",
            "emoji": "💼",
            "frameCount": 462200,
            "title": "Nathan for You",
            "updatedAt": "2024-03-22T01:06:20.188Z",
            "status": 0,
            "id": "nathanforyou",
            "version": 2
        },
        "__typename": "Alias"
    }
];

  return NextResponse.json(searchIndexes);
}
