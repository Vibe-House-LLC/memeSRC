/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateSeries = /* GraphQL */ `
  subscription OnCreateSeries($filter: ModelSubscriptionSeriesFilterInput) {
    onCreateSeries(filter: $filter) {
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
export const onUpdateSeries = /* GraphQL */ `
  subscription OnUpdateSeries($filter: ModelSubscriptionSeriesFilterInput) {
    onUpdateSeries(filter: $filter) {
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
export const onDeleteSeries = /* GraphQL */ `
  subscription OnDeleteSeries($filter: ModelSubscriptionSeriesFilterInput) {
    onDeleteSeries(filter: $filter) {
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
export const onCreateSourceMedia = /* GraphQL */ `
  subscription OnCreateSourceMedia(
    $filter: ModelSubscriptionSourceMediaFilterInput
  ) {
    onCreateSourceMedia(filter: $filter) {
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
export const onUpdateSourceMedia = /* GraphQL */ `
  subscription OnUpdateSourceMedia(
    $filter: ModelSubscriptionSourceMediaFilterInput
  ) {
    onUpdateSourceMedia(filter: $filter) {
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
export const onDeleteSourceMedia = /* GraphQL */ `
  subscription OnDeleteSourceMedia(
    $filter: ModelSubscriptionSourceMediaFilterInput
  ) {
    onDeleteSourceMedia(filter: $filter) {
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
export const onCreateFile = /* GraphQL */ `
  subscription OnCreateFile($filter: ModelSubscriptionFileFilterInput) {
    onCreateFile(filter: $filter) {
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
export const onUpdateFile = /* GraphQL */ `
  subscription OnUpdateFile($filter: ModelSubscriptionFileFilterInput) {
    onUpdateFile(filter: $filter) {
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
export const onDeleteFile = /* GraphQL */ `
  subscription OnDeleteFile($filter: ModelSubscriptionFileFilterInput) {
    onDeleteFile(filter: $filter) {
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
export const onCreateSeason = /* GraphQL */ `
  subscription OnCreateSeason($filter: ModelSubscriptionSeasonFilterInput) {
    onCreateSeason(filter: $filter) {
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
export const onUpdateSeason = /* GraphQL */ `
  subscription OnUpdateSeason($filter: ModelSubscriptionSeasonFilterInput) {
    onUpdateSeason(filter: $filter) {
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
export const onDeleteSeason = /* GraphQL */ `
  subscription OnDeleteSeason($filter: ModelSubscriptionSeasonFilterInput) {
    onDeleteSeason(filter: $filter) {
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
export const onCreateEpisode = /* GraphQL */ `
  subscription OnCreateEpisode($filter: ModelSubscriptionEpisodeFilterInput) {
    onCreateEpisode(filter: $filter) {
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
export const onUpdateEpisode = /* GraphQL */ `
  subscription OnUpdateEpisode($filter: ModelSubscriptionEpisodeFilterInput) {
    onUpdateEpisode(filter: $filter) {
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
export const onDeleteEpisode = /* GraphQL */ `
  subscription OnDeleteEpisode($filter: ModelSubscriptionEpisodeFilterInput) {
    onDeleteEpisode(filter: $filter) {
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
export const onCreateSubtitle = /* GraphQL */ `
  subscription OnCreateSubtitle($filter: ModelSubscriptionSubtitleFilterInput) {
    onCreateSubtitle(filter: $filter) {
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
export const onUpdateSubtitle = /* GraphQL */ `
  subscription OnUpdateSubtitle($filter: ModelSubscriptionSubtitleFilterInput) {
    onUpdateSubtitle(filter: $filter) {
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
export const onDeleteSubtitle = /* GraphQL */ `
  subscription OnDeleteSubtitle($filter: ModelSubscriptionSubtitleFilterInput) {
    onDeleteSubtitle(filter: $filter) {
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
export const onCreateAnalyticsMetrics = /* GraphQL */ `
  subscription OnCreateAnalyticsMetrics(
    $filter: ModelSubscriptionAnalyticsMetricsFilterInput
  ) {
    onCreateAnalyticsMetrics(filter: $filter) {
      id
      value
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateAnalyticsMetrics = /* GraphQL */ `
  subscription OnUpdateAnalyticsMetrics(
    $filter: ModelSubscriptionAnalyticsMetricsFilterInput
  ) {
    onUpdateAnalyticsMetrics(filter: $filter) {
      id
      value
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteAnalyticsMetrics = /* GraphQL */ `
  subscription OnDeleteAnalyticsMetrics(
    $filter: ModelSubscriptionAnalyticsMetricsFilterInput
  ) {
    onDeleteAnalyticsMetrics(filter: $filter) {
      id
      value
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateContentMetadata = /* GraphQL */ `
  subscription OnCreateContentMetadata(
    $filter: ModelSubscriptionContentMetadataFilterInput
  ) {
    onCreateContentMetadata(filter: $filter) {
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
export const onUpdateContentMetadata = /* GraphQL */ `
  subscription OnUpdateContentMetadata(
    $filter: ModelSubscriptionContentMetadataFilterInput
  ) {
    onUpdateContentMetadata(filter: $filter) {
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
export const onDeleteContentMetadata = /* GraphQL */ `
  subscription OnDeleteContentMetadata(
    $filter: ModelSubscriptionContentMetadataFilterInput
  ) {
    onDeleteContentMetadata(filter: $filter) {
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
export const onCreateHomepageSection = /* GraphQL */ `
  subscription OnCreateHomepageSection(
    $filter: ModelSubscriptionHomepageSectionFilterInput
  ) {
    onCreateHomepageSection(filter: $filter) {
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
export const onUpdateHomepageSection = /* GraphQL */ `
  subscription OnUpdateHomepageSection(
    $filter: ModelSubscriptionHomepageSectionFilterInput
  ) {
    onUpdateHomepageSection(filter: $filter) {
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
export const onDeleteHomepageSection = /* GraphQL */ `
  subscription OnDeleteHomepageSection(
    $filter: ModelSubscriptionHomepageSectionFilterInput
  ) {
    onDeleteHomepageSection(filter: $filter) {
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
export const onCreateUserDetails = /* GraphQL */ `
  subscription OnCreateUserDetails(
    $filter: ModelSubscriptionUserDetailsFilterInput
  ) {
    onCreateUserDetails(filter: $filter) {
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
export const onUpdateUserDetails = /* GraphQL */ `
  subscription OnUpdateUserDetails(
    $filter: ModelSubscriptionUserDetailsFilterInput
  ) {
    onUpdateUserDetails(filter: $filter) {
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
export const onDeleteUserDetails = /* GraphQL */ `
  subscription OnDeleteUserDetails(
    $filter: ModelSubscriptionUserDetailsFilterInput
  ) {
    onDeleteUserDetails(filter: $filter) {
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
