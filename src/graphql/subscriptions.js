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
        }
        nextToken
      }
      statusText
      createdAt
      updatedAt
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
        }
        nextToken
      }
      statusText
      createdAt
      updatedAt
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
        }
        nextToken
      }
      statusText
      createdAt
      updatedAt
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
        }
        nextToken
      }
      status
      user {
        id
        username
        email
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        sourceMedia {
          nextToken
        }
        status
        votes {
          nextToken
        }
        credits
        stripeCustomer {
          id
          createdAt
          updatedAt
          stripeCustomerUserId
        }
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerId
      }
      createdAt
      updatedAt
      userDetailsSourceMediaId
      sourceMediaSeriesId
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
        }
        nextToken
      }
      status
      user {
        id
        username
        email
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        sourceMedia {
          nextToken
        }
        status
        votes {
          nextToken
        }
        credits
        stripeCustomer {
          id
          createdAt
          updatedAt
          stripeCustomerUserId
        }
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerId
      }
      createdAt
      updatedAt
      userDetailsSourceMediaId
      sourceMediaSeriesId
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
        }
        nextToken
      }
      status
      user {
        id
        username
        email
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        sourceMedia {
          nextToken
        }
        status
        votes {
          nextToken
        }
        credits
        stripeCustomer {
          id
          createdAt
          updatedAt
          stripeCustomerUserId
        }
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerId
      }
      createdAt
      updatedAt
      userDetailsSourceMediaId
      sourceMediaSeriesId
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
        }
        files {
          nextToken
        }
        status
        user {
          id
          username
          email
          earlyAccessStatus
          contributorAccessStatus
          stripeId
          status
          credits
          magicSubscription
          createdAt
          updatedAt
          userDetailsStripeCustomerId
        }
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
      }
      key
      status
      createdAt
      updatedAt
      sourceMediaFilesId
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
        }
        files {
          nextToken
        }
        status
        user {
          id
          username
          email
          earlyAccessStatus
          contributorAccessStatus
          stripeId
          status
          credits
          magicSubscription
          createdAt
          updatedAt
          userDetailsStripeCustomerId
        }
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
      }
      key
      status
      createdAt
      updatedAt
      sourceMediaFilesId
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
        }
        files {
          nextToken
        }
        status
        user {
          id
          username
          email
          earlyAccessStatus
          contributorAccessStatus
          stripeId
          status
          credits
          magicSubscription
          createdAt
          updatedAt
          userDetailsStripeCustomerId
        }
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
      }
      key
      status
      createdAt
      updatedAt
      sourceMediaFilesId
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
export const onCreateAnalyticsMetrics = /* GraphQL */ `
  subscription OnCreateAnalyticsMetrics(
    $filter: ModelSubscriptionAnalyticsMetricsFilterInput
  ) {
    onCreateAnalyticsMetrics(filter: $filter) {
      id
      value
      createdAt
      updatedAt
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
      earlyAccessStatus
      contributorAccessStatus
      stripeId
      sourceMedia {
        items {
          id
          status
          createdAt
          updatedAt
          userDetailsSourceMediaId
          sourceMediaSeriesId
        }
        nextToken
      }
      status
      votes {
        items {
          id
          boost
          createdAt
          updatedAt
          userDetailsVotesId
          seriesUserVoteSeriesId
        }
        nextToken
      }
      credits
      stripeCustomer {
        id
        user {
          id
          username
          email
          earlyAccessStatus
          contributorAccessStatus
          stripeId
          status
          credits
          magicSubscription
          createdAt
          updatedAt
          userDetailsStripeCustomerId
        }
        createdAt
        updatedAt
        stripeCustomerUserId
      }
      magicSubscription
      createdAt
      updatedAt
      userDetailsStripeCustomerId
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
      earlyAccessStatus
      contributorAccessStatus
      stripeId
      sourceMedia {
        items {
          id
          status
          createdAt
          updatedAt
          userDetailsSourceMediaId
          sourceMediaSeriesId
        }
        nextToken
      }
      status
      votes {
        items {
          id
          boost
          createdAt
          updatedAt
          userDetailsVotesId
          seriesUserVoteSeriesId
        }
        nextToken
      }
      credits
      stripeCustomer {
        id
        user {
          id
          username
          email
          earlyAccessStatus
          contributorAccessStatus
          stripeId
          status
          credits
          magicSubscription
          createdAt
          updatedAt
          userDetailsStripeCustomerId
        }
        createdAt
        updatedAt
        stripeCustomerUserId
      }
      magicSubscription
      createdAt
      updatedAt
      userDetailsStripeCustomerId
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
      earlyAccessStatus
      contributorAccessStatus
      stripeId
      sourceMedia {
        items {
          id
          status
          createdAt
          updatedAt
          userDetailsSourceMediaId
          sourceMediaSeriesId
        }
        nextToken
      }
      status
      votes {
        items {
          id
          boost
          createdAt
          updatedAt
          userDetailsVotesId
          seriesUserVoteSeriesId
        }
        nextToken
      }
      credits
      stripeCustomer {
        id
        user {
          id
          username
          email
          earlyAccessStatus
          contributorAccessStatus
          stripeId
          status
          credits
          magicSubscription
          createdAt
          updatedAt
          userDetailsStripeCustomerId
        }
        createdAt
        updatedAt
        stripeCustomerUserId
      }
      magicSubscription
      createdAt
      updatedAt
      userDetailsStripeCustomerId
    }
  }
`;
export const onCreateStripeCustomer = /* GraphQL */ `
  subscription OnCreateStripeCustomer(
    $filter: ModelSubscriptionStripeCustomerFilterInput
  ) {
    onCreateStripeCustomer(filter: $filter) {
      id
      user {
        id
        username
        email
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        sourceMedia {
          nextToken
        }
        status
        votes {
          nextToken
        }
        credits
        stripeCustomer {
          id
          createdAt
          updatedAt
          stripeCustomerUserId
        }
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerId
      }
      createdAt
      updatedAt
      stripeCustomerUserId
    }
  }
`;
export const onUpdateStripeCustomer = /* GraphQL */ `
  subscription OnUpdateStripeCustomer(
    $filter: ModelSubscriptionStripeCustomerFilterInput
  ) {
    onUpdateStripeCustomer(filter: $filter) {
      id
      user {
        id
        username
        email
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        sourceMedia {
          nextToken
        }
        status
        votes {
          nextToken
        }
        credits
        stripeCustomer {
          id
          createdAt
          updatedAt
          stripeCustomerUserId
        }
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerId
      }
      createdAt
      updatedAt
      stripeCustomerUserId
    }
  }
`;
export const onDeleteStripeCustomer = /* GraphQL */ `
  subscription OnDeleteStripeCustomer(
    $filter: ModelSubscriptionStripeCustomerFilterInput
  ) {
    onDeleteStripeCustomer(filter: $filter) {
      id
      user {
        id
        username
        email
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        sourceMedia {
          nextToken
        }
        status
        votes {
          nextToken
        }
        credits
        stripeCustomer {
          id
          createdAt
          updatedAt
          stripeCustomerUserId
        }
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerId
      }
      createdAt
      updatedAt
      stripeCustomerUserId
    }
  }
`;
export const onCreateSeriesUserVote = /* GraphQL */ `
  subscription OnCreateSeriesUserVote(
    $filter: ModelSubscriptionSeriesUserVoteFilterInput
  ) {
    onCreateSeriesUserVote(filter: $filter) {
      id
      user {
        id
        username
        email
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        sourceMedia {
          nextToken
        }
        status
        votes {
          nextToken
        }
        credits
        stripeCustomer {
          id
          createdAt
          updatedAt
          stripeCustomerUserId
        }
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerId
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
        }
        statusText
        createdAt
        updatedAt
      }
      boost
      createdAt
      updatedAt
      userDetailsVotesId
      seriesUserVoteSeriesId
    }
  }
`;
export const onUpdateSeriesUserVote = /* GraphQL */ `
  subscription OnUpdateSeriesUserVote(
    $filter: ModelSubscriptionSeriesUserVoteFilterInput
  ) {
    onUpdateSeriesUserVote(filter: $filter) {
      id
      user {
        id
        username
        email
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        sourceMedia {
          nextToken
        }
        status
        votes {
          nextToken
        }
        credits
        stripeCustomer {
          id
          createdAt
          updatedAt
          stripeCustomerUserId
        }
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerId
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
        }
        statusText
        createdAt
        updatedAt
      }
      boost
      createdAt
      updatedAt
      userDetailsVotesId
      seriesUserVoteSeriesId
    }
  }
`;
export const onDeleteSeriesUserVote = /* GraphQL */ `
  subscription OnDeleteSeriesUserVote(
    $filter: ModelSubscriptionSeriesUserVoteFilterInput
  ) {
    onDeleteSeriesUserVote(filter: $filter) {
      id
      user {
        id
        username
        email
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        sourceMedia {
          nextToken
        }
        status
        votes {
          nextToken
        }
        credits
        stripeCustomer {
          id
          createdAt
          updatedAt
          stripeCustomerUserId
        }
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerId
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
        }
        statusText
        createdAt
        updatedAt
      }
      boost
      createdAt
      updatedAt
      userDetailsVotesId
      seriesUserVoteSeriesId
    }
  }
`;
