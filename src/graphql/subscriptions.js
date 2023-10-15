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
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        status
        credits
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
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
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        status
        credits
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
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
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        status
        credits
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
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
  }
`;
export const onUpdateFile = /* GraphQL */ `
  subscription OnUpdateFile($filter: ModelSubscriptionFileFilterInput) {
    onUpdateFile(filter: $filter) {
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
  }
`;
export const onDeleteFile = /* GraphQL */ `
  subscription OnDeleteFile($filter: ModelSubscriptionFileFilterInput) {
    onDeleteFile(filter: $filter) {
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
      earlyAccessStatus
      contributorAccessStatus
      stripeId
      sourceMedia {
        nextToken
        __typename
      }
      status
      votes {
        nextToken
        __typename
      }
      credits
      stripeCustomerInfo {
        id
        createdAt
        updatedAt
        stripeCustomerUserId
        __typename
      }
      stripeCheckoutSession {
        nextToken
        __typename
      }
      subscriptionPeriodStart
      subscriptionPeriodEnd
      subscriptionStatus
      magicSubscription
      userNotifications {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      userDetailsStripeCustomerInfoId
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
      earlyAccessStatus
      contributorAccessStatus
      stripeId
      sourceMedia {
        nextToken
        __typename
      }
      status
      votes {
        nextToken
        __typename
      }
      credits
      stripeCustomerInfo {
        id
        createdAt
        updatedAt
        stripeCustomerUserId
        __typename
      }
      stripeCheckoutSession {
        nextToken
        __typename
      }
      subscriptionPeriodStart
      subscriptionPeriodEnd
      subscriptionStatus
      magicSubscription
      userNotifications {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      userDetailsStripeCustomerInfoId
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
      earlyAccessStatus
      contributorAccessStatus
      stripeId
      sourceMedia {
        nextToken
        __typename
      }
      status
      votes {
        nextToken
        __typename
      }
      credits
      stripeCustomerInfo {
        id
        createdAt
        updatedAt
        stripeCustomerUserId
        __typename
      }
      stripeCheckoutSession {
        nextToken
        __typename
      }
      subscriptionPeriodStart
      subscriptionPeriodEnd
      subscriptionStatus
      magicSubscription
      userNotifications {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      userDetailsStripeCustomerInfoId
      __typename
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
        status
        credits
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      stripeCustomerUserId
      __typename
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
        status
        credits
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      stripeCustomerUserId
      __typename
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
        status
        credits
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      stripeCustomerUserId
      __typename
    }
  }
`;
export const onCreateStripeCheckoutSession = /* GraphQL */ `
  subscription OnCreateStripeCheckoutSession(
    $filter: ModelSubscriptionStripeCheckoutSessionFilterInput
  ) {
    onCreateStripeCheckoutSession(filter: $filter) {
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
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      status
      createdAt
      updatedAt
      userDetailsStripeCheckoutSessionId
      __typename
    }
  }
`;
export const onUpdateStripeCheckoutSession = /* GraphQL */ `
  subscription OnUpdateStripeCheckoutSession(
    $filter: ModelSubscriptionStripeCheckoutSessionFilterInput
  ) {
    onUpdateStripeCheckoutSession(filter: $filter) {
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
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      status
      createdAt
      updatedAt
      userDetailsStripeCheckoutSessionId
      __typename
    }
  }
`;
export const onDeleteStripeCheckoutSession = /* GraphQL */ `
  subscription OnDeleteStripeCheckoutSession(
    $filter: ModelSubscriptionStripeCheckoutSessionFilterInput
  ) {
    onDeleteStripeCheckoutSession(filter: $filter) {
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
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      status
      createdAt
      updatedAt
      userDetailsStripeCheckoutSessionId
      __typename
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
        status
        credits
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
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
        statusText
        createdAt
        updatedAt
        __typename
      }
      boost
      createdAt
      updatedAt
      userDetailsVotesId
      seriesUserVoteSeriesId
      __typename
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
        status
        credits
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
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
        statusText
        createdAt
        updatedAt
        __typename
      }
      boost
      createdAt
      updatedAt
      userDetailsVotesId
      seriesUserVoteSeriesId
      __typename
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
        status
        credits
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
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
        statusText
        createdAt
        updatedAt
        __typename
      }
      boost
      createdAt
      updatedAt
      userDetailsVotesId
      seriesUserVoteSeriesId
      __typename
    }
  }
`;
export const onCreateUserNotification = /* GraphQL */ `
  subscription OnCreateUserNotification(
    $filter: ModelSubscriptionUserNotificationFilterInput
  ) {
    onCreateUserNotification(filter: $filter) {
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
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      title
      description
      avatar
      type
      isUnRead
      path
      createdAt
      updatedAt
      userDetailsUserNotificationsId
      __typename
    }
  }
`;
export const onUpdateUserNotification = /* GraphQL */ `
  subscription OnUpdateUserNotification(
    $filter: ModelSubscriptionUserNotificationFilterInput
  ) {
    onUpdateUserNotification(filter: $filter) {
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
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      title
      description
      avatar
      type
      isUnRead
      path
      createdAt
      updatedAt
      userDetailsUserNotificationsId
      __typename
    }
  }
`;
export const onDeleteUserNotification = /* GraphQL */ `
  subscription OnDeleteUserNotification(
    $filter: ModelSubscriptionUserNotificationFilterInput
  ) {
    onDeleteUserNotification(filter: $filter) {
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
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      title
      description
      avatar
      type
      isUnRead
      path
      createdAt
      updatedAt
      userDetailsUserNotificationsId
      __typename
    }
  }
`;
export const onCreateFrameSubtitle = /* GraphQL */ `
  subscription OnCreateFrameSubtitle(
    $filter: ModelSubscriptionFrameSubtitleFilterInput
  ) {
    onCreateFrameSubtitle(filter: $filter) {
      id
      subtitle
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateFrameSubtitle = /* GraphQL */ `
  subscription OnUpdateFrameSubtitle(
    $filter: ModelSubscriptionFrameSubtitleFilterInput
  ) {
    onUpdateFrameSubtitle(filter: $filter) {
      id
      subtitle
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteFrameSubtitle = /* GraphQL */ `
  subscription OnDeleteFrameSubtitle(
    $filter: ModelSubscriptionFrameSubtitleFilterInput
  ) {
    onDeleteFrameSubtitle(filter: $filter) {
      id
      subtitle
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateMagicResult = /* GraphQL */ `
  subscription OnCreateMagicResult(
    $filter: ModelSubscriptionMagicResultFilterInput
  ) {
    onCreateMagicResult(filter: $filter) {
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
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      prompt
      results
      createdAt
      updatedAt
      magicResultUserId
      __typename
    }
  }
`;
export const onUpdateMagicResult = /* GraphQL */ `
  subscription OnUpdateMagicResult(
    $filter: ModelSubscriptionMagicResultFilterInput
  ) {
    onUpdateMagicResult(filter: $filter) {
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
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      prompt
      results
      createdAt
      updatedAt
      magicResultUserId
      __typename
    }
  }
`;
export const onDeleteMagicResult = /* GraphQL */ `
  subscription OnDeleteMagicResult(
    $filter: ModelSubscriptionMagicResultFilterInput
  ) {
    onDeleteMagicResult(filter: $filter) {
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
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      prompt
      results
      createdAt
      updatedAt
      magicResultUserId
      __typename
    }
  }
`;
