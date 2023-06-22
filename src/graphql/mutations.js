/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createSeries = /* GraphQL */ `
  mutation CreateSeries(
    $input: CreateSeriesInput!
    $condition: ModelSeriesConditionInput
  ) {
    createSeries(input: $input, condition: $condition) {
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
export const updateSeries = /* GraphQL */ `
  mutation UpdateSeries(
    $input: UpdateSeriesInput!
    $condition: ModelSeriesConditionInput
  ) {
    updateSeries(input: $input, condition: $condition) {
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
export const deleteSeries = /* GraphQL */ `
  mutation DeleteSeries(
    $input: DeleteSeriesInput!
    $condition: ModelSeriesConditionInput
  ) {
    deleteSeries(input: $input, condition: $condition) {
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
export const createSourceMedia = /* GraphQL */ `
  mutation CreateSourceMedia(
    $input: CreateSourceMediaInput!
    $condition: ModelSourceMediaConditionInput
  ) {
    createSourceMedia(input: $input, condition: $condition) {
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
export const updateSourceMedia = /* GraphQL */ `
  mutation UpdateSourceMedia(
    $input: UpdateSourceMediaInput!
    $condition: ModelSourceMediaConditionInput
  ) {
    updateSourceMedia(input: $input, condition: $condition) {
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
export const deleteSourceMedia = /* GraphQL */ `
  mutation DeleteSourceMedia(
    $input: DeleteSourceMediaInput!
    $condition: ModelSourceMediaConditionInput
  ) {
    deleteSourceMedia(input: $input, condition: $condition) {
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
export const createFile = /* GraphQL */ `
  mutation CreateFile(
    $input: CreateFileInput!
    $condition: ModelFileConditionInput
  ) {
    createFile(input: $input, condition: $condition) {
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
export const updateFile = /* GraphQL */ `
  mutation UpdateFile(
    $input: UpdateFileInput!
    $condition: ModelFileConditionInput
  ) {
    updateFile(input: $input, condition: $condition) {
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
export const deleteFile = /* GraphQL */ `
  mutation DeleteFile(
    $input: DeleteFileInput!
    $condition: ModelFileConditionInput
  ) {
    deleteFile(input: $input, condition: $condition) {
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
export const createSeason = /* GraphQL */ `
  mutation CreateSeason(
    $input: CreateSeasonInput!
    $condition: ModelSeasonConditionInput
  ) {
    createSeason(input: $input, condition: $condition) {
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
export const updateSeason = /* GraphQL */ `
  mutation UpdateSeason(
    $input: UpdateSeasonInput!
    $condition: ModelSeasonConditionInput
  ) {
    updateSeason(input: $input, condition: $condition) {
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
export const deleteSeason = /* GraphQL */ `
  mutation DeleteSeason(
    $input: DeleteSeasonInput!
    $condition: ModelSeasonConditionInput
  ) {
    deleteSeason(input: $input, condition: $condition) {
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
export const createEpisode = /* GraphQL */ `
  mutation CreateEpisode(
    $input: CreateEpisodeInput!
    $condition: ModelEpisodeConditionInput
  ) {
    createEpisode(input: $input, condition: $condition) {
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
export const updateEpisode = /* GraphQL */ `
  mutation UpdateEpisode(
    $input: UpdateEpisodeInput!
    $condition: ModelEpisodeConditionInput
  ) {
    updateEpisode(input: $input, condition: $condition) {
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
export const deleteEpisode = /* GraphQL */ `
  mutation DeleteEpisode(
    $input: DeleteEpisodeInput!
    $condition: ModelEpisodeConditionInput
  ) {
    deleteEpisode(input: $input, condition: $condition) {
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
export const createSubtitle = /* GraphQL */ `
  mutation CreateSubtitle(
    $input: CreateSubtitleInput!
    $condition: ModelSubtitleConditionInput
  ) {
    createSubtitle(input: $input, condition: $condition) {
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
export const updateSubtitle = /* GraphQL */ `
  mutation UpdateSubtitle(
    $input: UpdateSubtitleInput!
    $condition: ModelSubtitleConditionInput
  ) {
    updateSubtitle(input: $input, condition: $condition) {
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
export const deleteSubtitle = /* GraphQL */ `
  mutation DeleteSubtitle(
    $input: DeleteSubtitleInput!
    $condition: ModelSubtitleConditionInput
  ) {
    deleteSubtitle(input: $input, condition: $condition) {
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
export const createAnalyticsMetrics = /* GraphQL */ `
  mutation CreateAnalyticsMetrics(
    $input: CreateAnalyticsMetricsInput!
    $condition: ModelAnalyticsMetricsConditionInput
  ) {
    createAnalyticsMetrics(input: $input, condition: $condition) {
      id
      value
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateAnalyticsMetrics = /* GraphQL */ `
  mutation UpdateAnalyticsMetrics(
    $input: UpdateAnalyticsMetricsInput!
    $condition: ModelAnalyticsMetricsConditionInput
  ) {
    updateAnalyticsMetrics(input: $input, condition: $condition) {
      id
      value
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteAnalyticsMetrics = /* GraphQL */ `
  mutation DeleteAnalyticsMetrics(
    $input: DeleteAnalyticsMetricsInput!
    $condition: ModelAnalyticsMetricsConditionInput
  ) {
    deleteAnalyticsMetrics(input: $input, condition: $condition) {
      id
      value
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createContentMetadata = /* GraphQL */ `
  mutation CreateContentMetadata(
    $input: CreateContentMetadataInput!
    $condition: ModelContentMetadataConditionInput
  ) {
    createContentMetadata(input: $input, condition: $condition) {
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
export const updateContentMetadata = /* GraphQL */ `
  mutation UpdateContentMetadata(
    $input: UpdateContentMetadataInput!
    $condition: ModelContentMetadataConditionInput
  ) {
    updateContentMetadata(input: $input, condition: $condition) {
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
export const deleteContentMetadata = /* GraphQL */ `
  mutation DeleteContentMetadata(
    $input: DeleteContentMetadataInput!
    $condition: ModelContentMetadataConditionInput
  ) {
    deleteContentMetadata(input: $input, condition: $condition) {
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
export const createHomepageSection = /* GraphQL */ `
  mutation CreateHomepageSection(
    $input: CreateHomepageSectionInput!
    $condition: ModelHomepageSectionConditionInput
  ) {
    createHomepageSection(input: $input, condition: $condition) {
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
export const updateHomepageSection = /* GraphQL */ `
  mutation UpdateHomepageSection(
    $input: UpdateHomepageSectionInput!
    $condition: ModelHomepageSectionConditionInput
  ) {
    updateHomepageSection(input: $input, condition: $condition) {
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
export const deleteHomepageSection = /* GraphQL */ `
  mutation DeleteHomepageSection(
    $input: DeleteHomepageSectionInput!
    $condition: ModelHomepageSectionConditionInput
  ) {
    deleteHomepageSection(input: $input, condition: $condition) {
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
export const createUserDetails = /* GraphQL */ `
  mutation CreateUserDetails(
    $input: CreateUserDetailsInput!
    $condition: ModelUserDetailsConditionInput
  ) {
    createUserDetails(input: $input, condition: $condition) {
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
export const updateUserDetails = /* GraphQL */ `
  mutation UpdateUserDetails(
    $input: UpdateUserDetailsInput!
    $condition: ModelUserDetailsConditionInput
  ) {
    updateUserDetails(input: $input, condition: $condition) {
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
export const deleteUserDetails = /* GraphQL */ `
  mutation DeleteUserDetails(
    $input: DeleteUserDetailsInput!
    $condition: ModelUserDetailsConditionInput
  ) {
    deleteUserDetails(input: $input, condition: $condition) {
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
export const createSeriesUserVote = /* GraphQL */ `
  mutation CreateSeriesUserVote(
    $input: CreateSeriesUserVoteInput!
    $condition: ModelSeriesUserVoteConditionInput
  ) {
    createSeriesUserVote(input: $input, condition: $condition) {
      id
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
      boost
      createdAt
      updatedAt
      seriesUserVoteUserId
      seriesUserVoteSeriesId
      __typename
    }
  }
`;
export const updateSeriesUserVote = /* GraphQL */ `
  mutation UpdateSeriesUserVote(
    $input: UpdateSeriesUserVoteInput!
    $condition: ModelSeriesUserVoteConditionInput
  ) {
    updateSeriesUserVote(input: $input, condition: $condition) {
      id
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
      boost
      createdAt
      updatedAt
      seriesUserVoteUserId
      seriesUserVoteSeriesId
      __typename
    }
  }
`;
export const deleteSeriesUserVote = /* GraphQL */ `
  mutation DeleteSeriesUserVote(
    $input: DeleteSeriesUserVoteInput!
    $condition: ModelSeriesUserVoteConditionInput
  ) {
    deleteSeriesUserVote(input: $input, condition: $condition) {
      id
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
      boost
      createdAt
      updatedAt
      seriesUserVoteUserId
      seriesUserVoteSeriesId
      __typename
    }
  }
`;
