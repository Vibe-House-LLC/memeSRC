/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getSeries = /* GraphQL */ `
  query GetSeries($id: ID!) {
    getSeries(id: $id) {
      id
      tvdbid
      slug
      name
      year
      image
      description
      seasons {
        items {
          id
          tvdbid
          year
          image
          description
          createdAt
          updatedAt
          seriesSeasonsId
          __typename
        }
        nextToken
        __typename
      }
      statusText
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listSeries = /* GraphQL */ `
  query ListSeries(
    $filter: ModelSeriesFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSeries(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        tvdbid
        slug
        name
        year
        image
        description
        seasons {
          nextToken
          __typename
        }
        statusText
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getSourceMedia = /* GraphQL */ `
  query GetSourceMedia($id: ID!) {
    getSourceMedia(id: $id) {
      id
      series {
        id
        tvdbid
        slug
        name
        year
        image
        description
        seasons {
          nextToken
          __typename
        }
        statusText
        createdAt
        updatedAt
        __typename
      }
      files {
        items {
          id
          key
          status
          createdAt
          updatedAt
          sourceMediaFilesId
          __typename
        }
        nextToken
        __typename
      }
      status
      user {
        id
        username
        email
        stripeId
        sourceMedia {
          nextToken
          __typename
        }
        status
        credits
        createdAt
        updatedAt
        __typename
      }
      createdAt
      updatedAt
      userDetailsSourceMediaId
      sourceMediaSeriesId
      __typename
    }
  }
`;
export const listSourceMedias = /* GraphQL */ `
  query ListSourceMedias(
    $filter: ModelSourceMediaFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSourceMedias(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        series {
          id
          tvdbid
          slug
          name
          year
          image
          description
          statusText
          createdAt
          updatedAt
          __typename
        }
        files {
          nextToken
          __typename
        }
        status
        user {
          id
          username
          email
          stripeId
          status
          credits
          createdAt
          updatedAt
          __typename
        }
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getFile = /* GraphQL */ `
  query GetFile($id: ID!) {
    getFile(id: $id) {
      id
      sourceMedia {
        id
        series {
          id
          tvdbid
          slug
          name
          year
          image
          description
          statusText
          createdAt
          updatedAt
          __typename
        }
        files {
          nextToken
          __typename
        }
        status
        user {
          id
          username
          email
          stripeId
          status
          credits
          createdAt
          updatedAt
          __typename
        }
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
        __typename
      }
      key
      status
      createdAt
      updatedAt
      sourceMediaFilesId
      __typename
    }
  }
`;
export const listFiles = /* GraphQL */ `
  query ListFiles(
    $filter: ModelFileFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listFiles(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        sourceMedia {
          id
          status
          createdAt
          updatedAt
          userDetailsSourceMediaId
          sourceMediaSeriesId
          __typename
        }
        key
        status
        createdAt
        updatedAt
        sourceMediaFilesId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getSeason = /* GraphQL */ `
  query GetSeason($id: ID!) {
    getSeason(id: $id) {
      id
      tvdbid
      year
      image
      description
      series {
        id
        tvdbid
        slug
        name
        year
        image
        description
        seasons {
          nextToken
          __typename
        }
        statusText
        createdAt
        updatedAt
        __typename
      }
      episodes {
        items {
          id
          tvdbid
          year
          image
          description
          createdAt
          updatedAt
          seasonEpisodesId
          __typename
        }
        nextToken
        __typename
      }
      createdAt
      updatedAt
      seriesSeasonsId
      __typename
    }
  }
`;
export const listSeasons = /* GraphQL */ `
  query ListSeasons(
    $filter: ModelSeasonFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSeasons(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        tvdbid
        year
        image
        description
        series {
          id
          tvdbid
          slug
          name
          year
          image
          description
          statusText
          createdAt
          updatedAt
          __typename
        }
        episodes {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getEpisode = /* GraphQL */ `
  query GetEpisode($id: ID!) {
    getEpisode(id: $id) {
      id
      tvdbid
      year
      image
      description
      season {
        id
        tvdbid
        year
        image
        description
        series {
          id
          tvdbid
          slug
          name
          year
          image
          description
          statusText
          createdAt
          updatedAt
          __typename
        }
        episodes {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      subtitles {
        items {
          id
          tvdbid
          year
          image
          description
          start
          end
          createdAt
          updatedAt
          episodeSubtitlesId
          __typename
        }
        nextToken
        __typename
      }
      createdAt
      updatedAt
      seasonEpisodesId
      __typename
    }
  }
`;
export const listEpisodes = /* GraphQL */ `
  query ListEpisodes(
    $filter: ModelEpisodeFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listEpisodes(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        tvdbid
        year
        image
        description
        season {
          id
          tvdbid
          year
          image
          description
          createdAt
          updatedAt
          seriesSeasonsId
          __typename
        }
        subtitles {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        seasonEpisodesId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getSubtitle = /* GraphQL */ `
  query GetSubtitle($id: ID!) {
    getSubtitle(id: $id) {
      id
      tvdbid
      year
      image
      description
      start
      end
      episode {
        id
        tvdbid
        year
        image
        description
        season {
          id
          tvdbid
          year
          image
          description
          createdAt
          updatedAt
          seriesSeasonsId
          __typename
        }
        subtitles {
          nextToken
          __typename
        }
        createdAt
        updatedAt
        seasonEpisodesId
        __typename
      }
      createdAt
      updatedAt
      episodeSubtitlesId
      __typename
    }
  }
`;
export const listSubtitles = /* GraphQL */ `
  query ListSubtitles(
    $filter: ModelSubtitleFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSubtitles(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        tvdbid
        year
        image
        description
        start
        end
        episode {
          id
          tvdbid
          year
          image
          description
          createdAt
          updatedAt
          seasonEpisodesId
          __typename
        }
        createdAt
        updatedAt
        episodeSubtitlesId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getAnalyticsMetrics = /* GraphQL */ `
  query GetAnalyticsMetrics($id: ID!) {
    getAnalyticsMetrics(id: $id) {
      id
      value
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listAnalyticsMetrics = /* GraphQL */ `
  query ListAnalyticsMetrics(
    $filter: ModelAnalyticsMetricsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listAnalyticsMetrics(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        value
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getContentMetadata = /* GraphQL */ `
  query GetContentMetadata($id: ID!) {
    getContentMetadata(id: $id) {
      id
      title
      description
      frameCount
      colorMain
      colorSecondary
      emoji
      status
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listContentMetadata = /* GraphQL */ `
  query ListContentMetadata(
    $filter: ModelContentMetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listContentMetadata(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getHomepageSection = /* GraphQL */ `
  query GetHomepageSection($id: ID!) {
    getHomepageSection(id: $id) {
      id
      index
      title
      subtitle
      buttons
      bottomImage
      buttonSubtext
      backgroundColor
      textColor
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listHomepageSections = /* GraphQL */ `
  query ListHomepageSections(
    $filter: ModelHomepageSectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listHomepageSections(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        index
        title
        subtitle
        buttons
        bottomImage
        buttonSubtext
        backgroundColor
        textColor
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getUserDetails = /* GraphQL */ `
  query GetUserDetails($id: ID!) {
    getUserDetails(id: $id) {
      id
      username
      email
      stripeId
      sourceMedia {
        items {
          id
          status
          createdAt
          updatedAt
          userDetailsSourceMediaId
          sourceMediaSeriesId
          __typename
        }
        nextToken
        __typename
      }
      status
      credits
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listUserDetails = /* GraphQL */ `
  query ListUserDetails(
    $filter: ModelUserDetailsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUserDetails(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        username
        email
        stripeId
        sourceMedia {
          nextToken
          __typename
        }
        status
        credits
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
