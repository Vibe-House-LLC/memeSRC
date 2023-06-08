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
        }
        nextToken
      }
      statusText
      createdAt
      updatedAt
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
        }
        statusText
        createdAt
        updatedAt
      }
      nextToken
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
        }
        statusText
        createdAt
        updatedAt
      }
      files {
        items {
          id
          key
          status
          createdAt
          updatedAt
          sourceMediaFilesId
          fileSourceMediaId
        }
        nextToken
      }
      status
      user {
        id
        sub
        email
        stripeId
        sourceMedia {
          nextToken
        }
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
      userDetailsSourceMediaId
      sourceMediaSeriesId
      sourceMediaUserId
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
        }
        files {
          nextToken
        }
        status
        user {
          id
          sub
          email
          stripeId
          createdAt
          updatedAt
        }
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
        sourceMediaUserId
      }
      nextToken
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
        }
        files {
          nextToken
        }
        status
        user {
          id
          sub
          email
          stripeId
          createdAt
          updatedAt
        }
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
        sourceMediaUserId
      }
      key
      status
      createdAt
      updatedAt
      sourceMediaFilesId
      fileSourceMediaId
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
          sourceMediaUserId
        }
        key
        status
        createdAt
        updatedAt
        sourceMediaFilesId
        fileSourceMediaId
      }
      nextToken
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
        }
        statusText
        createdAt
        updatedAt
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
        }
        nextToken
      }
      createdAt
      updatedAt
      seriesSeasonsId
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
        }
        episodes {
          nextToken
        }
        createdAt
        updatedAt
        seriesSeasonsId
      }
      nextToken
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
        }
        episodes {
          nextToken
        }
        createdAt
        updatedAt
        seriesSeasonsId
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
        }
        nextToken
      }
      createdAt
      updatedAt
      seasonEpisodesId
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
        }
        subtitles {
          nextToken
        }
        createdAt
        updatedAt
        seasonEpisodesId
      }
      nextToken
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
        }
        subtitles {
          nextToken
        }
        createdAt
        updatedAt
        seasonEpisodesId
      }
      createdAt
      updatedAt
      episodeSubtitlesId
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
        }
        createdAt
        updatedAt
        episodeSubtitlesId
      }
      nextToken
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
      }
      nextToken
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
      }
      nextToken
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
      }
      nextToken
    }
  }
`;
export const getUserDetails = /* GraphQL */ `
  query GetUserDetails($id: ID!) {
    getUserDetails(id: $id) {
      id
      sub
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
          sourceMediaUserId
        }
        nextToken
      }
      createdAt
      updatedAt
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
        sub
        email
        stripeId
        sourceMedia {
          nextToken
        }
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
