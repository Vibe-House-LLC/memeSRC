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
      contributors {
        nextToken
        __typename
      }
      subtitles {
        nextToken
        __typename
      }
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
      contributors {
        nextToken
        __typename
      }
      subtitles {
        nextToken
        __typename
      }
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
      contributors {
        nextToken
        __typename
      }
      subtitles {
        nextToken
        __typename
      }
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      identityId
      pendingAlias
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      identityId
      pendingAlias
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      identityId
      pendingAlias
      createdAt
      updatedAt
      userDetailsSourceMediaId
      sourceMediaSeriesId
      __typename
    }
  }
`;
export const onCreateFile = /* GraphQL */ `
  subscription OnCreateFile(
    $filter: ModelSubscriptionFileFilterInput
    $owner: String
  ) {
    onCreateFile(filter: $filter, owner: $owner) {
      id
      sourceMedia {
        id
        status
        identityId
        pendingAlias
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
        __typename
      }
      key
      unzippedPath
      status
      createdAt
      updatedAt
      sourceMediaFilesId
      owner
      __typename
    }
  }
`;
export const onUpdateFile = /* GraphQL */ `
  subscription OnUpdateFile(
    $filter: ModelSubscriptionFileFilterInput
    $owner: String
  ) {
    onUpdateFile(filter: $filter, owner: $owner) {
      id
      sourceMedia {
        id
        status
        identityId
        pendingAlias
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
        __typename
      }
      key
      unzippedPath
      status
      createdAt
      updatedAt
      sourceMediaFilesId
      owner
      __typename
    }
  }
`;
export const onDeleteFile = /* GraphQL */ `
  subscription OnDeleteFile(
    $filter: ModelSubscriptionFileFilterInput
    $owner: String
  ) {
    onDeleteFile(filter: $filter, owner: $owner) {
      id
      sourceMedia {
        id
        status
        identityId
        pendingAlias
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
        __typename
      }
      key
      unzippedPath
      status
      createdAt
      updatedAt
      sourceMediaFilesId
      owner
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
      seasonNumber
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
      contributors {
        nextToken
        __typename
      }
      subtitles {
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
      seasonNumber
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
      contributors {
        nextToken
        __typename
      }
      subtitles {
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
      seasonNumber
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
      contributors {
        nextToken
        __typename
      }
      subtitles {
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
      episodeNumber
      name
      season {
        id
        tvdbid
        year
        image
        description
        seasonNumber
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      subtitles {
        nextToken
        __typename
      }
      contributors {
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
      episodeNumber
      name
      season {
        id
        tvdbid
        year
        image
        description
        seasonNumber
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      subtitles {
        nextToken
        __typename
      }
      contributors {
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
      episodeNumber
      name
      season {
        id
        tvdbid
        year
        image
        description
        seasonNumber
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      subtitles {
        nextToken
        __typename
      }
      contributors {
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
      subtitleIndex
      start
      end
      seasonId
      episodeId
      seriesId
      season {
        id
        tvdbid
        year
        image
        description
        seasonNumber
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      episode {
        id
        tvdbid
        year
        image
        description
        episodeNumber
        name
        createdAt
        updatedAt
        seasonEpisodesId
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
      createdAt
      updatedAt
      seriesSubtitlesId
      seasonSubtitlesId
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
      subtitleIndex
      start
      end
      seasonId
      episodeId
      seriesId
      season {
        id
        tvdbid
        year
        image
        description
        seasonNumber
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      episode {
        id
        tvdbid
        year
        image
        description
        episodeNumber
        name
        createdAt
        updatedAt
        seasonEpisodesId
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
      createdAt
      updatedAt
      seriesSubtitlesId
      seasonSubtitlesId
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
      subtitleIndex
      start
      end
      seasonId
      episodeId
      seriesId
      season {
        id
        tvdbid
        year
        image
        description
        seasonNumber
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      episode {
        id
        tvdbid
        year
        image
        description
        episodeNumber
        name
        createdAt
        updatedAt
        seasonEpisodesId
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
      createdAt
      updatedAt
      seriesSubtitlesId
      seasonSubtitlesId
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
      version
      users {
        nextToken
        __typename
      }
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
      version
      users {
        nextToken
        __typename
      }
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
      version
      users {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateFavorite = /* GraphQL */ `
  subscription OnCreateFavorite(
    $filter: ModelSubscriptionFavoriteFilterInput
    $owner: String
  ) {
    onCreateFavorite(filter: $filter, owner: $owner) {
      id
      owner
      cid
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateFavorite = /* GraphQL */ `
  subscription OnUpdateFavorite(
    $filter: ModelSubscriptionFavoriteFilterInput
    $owner: String
  ) {
    onUpdateFavorite(filter: $filter, owner: $owner) {
      id
      owner
      cid
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteFavorite = /* GraphQL */ `
  subscription OnDeleteFavorite(
    $filter: ModelSubscriptionFavoriteFilterInput
    $owner: String
  ) {
    onDeleteFavorite(filter: $filter, owner: $owner) {
      id
      owner
      cid
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateV2ContentMetadata = /* GraphQL */ `
  subscription OnCreateV2ContentMetadata(
    $filter: ModelSubscriptionV2ContentMetadataFilterInput
  ) {
    onCreateV2ContentMetadata(filter: $filter) {
      id
      title
      description
      frameCount
      colorMain
      colorSecondary
      emoji
      status
      version
      users {
        nextToken
        __typename
      }
      alias {
        id
        status
        createdAt
        updatedAt
        aliasV2ContentMetadataId
        __typename
      }
      fontFamily
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
      createdAt
      updatedAt
      v2ContentMetadataAliasId
      v2ContentMetadataSeriesId
      __typename
    }
  }
`;
export const onUpdateV2ContentMetadata = /* GraphQL */ `
  subscription OnUpdateV2ContentMetadata(
    $filter: ModelSubscriptionV2ContentMetadataFilterInput
  ) {
    onUpdateV2ContentMetadata(filter: $filter) {
      id
      title
      description
      frameCount
      colorMain
      colorSecondary
      emoji
      status
      version
      users {
        nextToken
        __typename
      }
      alias {
        id
        status
        createdAt
        updatedAt
        aliasV2ContentMetadataId
        __typename
      }
      fontFamily
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
      createdAt
      updatedAt
      v2ContentMetadataAliasId
      v2ContentMetadataSeriesId
      __typename
    }
  }
`;
export const onDeleteV2ContentMetadata = /* GraphQL */ `
  subscription OnDeleteV2ContentMetadata(
    $filter: ModelSubscriptionV2ContentMetadataFilterInput
  ) {
    onDeleteV2ContentMetadata(filter: $filter) {
      id
      title
      description
      frameCount
      colorMain
      colorSecondary
      emoji
      status
      version
      users {
        nextToken
        __typename
      }
      alias {
        id
        status
        createdAt
        updatedAt
        aliasV2ContentMetadataId
        __typename
      }
      fontFamily
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
      createdAt
      updatedAt
      v2ContentMetadataAliasId
      v2ContentMetadataSeriesId
      __typename
    }
  }
`;
export const onCreateAlias = /* GraphQL */ `
  subscription OnCreateAlias($filter: ModelSubscriptionAliasFilterInput) {
    onCreateAlias(filter: $filter) {
      id
      v2ContentMetadata {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        version
        fontFamily
        createdAt
        updatedAt
        v2ContentMetadataAliasId
        v2ContentMetadataSeriesId
        __typename
      }
      status
      createdAt
      updatedAt
      aliasV2ContentMetadataId
      __typename
    }
  }
`;
export const onUpdateAlias = /* GraphQL */ `
  subscription OnUpdateAlias($filter: ModelSubscriptionAliasFilterInput) {
    onUpdateAlias(filter: $filter) {
      id
      v2ContentMetadata {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        version
        fontFamily
        createdAt
        updatedAt
        v2ContentMetadataAliasId
        v2ContentMetadataSeriesId
        __typename
      }
      status
      createdAt
      updatedAt
      aliasV2ContentMetadataId
      __typename
    }
  }
`;
export const onDeleteAlias = /* GraphQL */ `
  subscription OnDeleteAlias($filter: ModelSubscriptionAliasFilterInput) {
    onDeleteAlias(filter: $filter) {
      id
      v2ContentMetadata {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        version
        fontFamily
        createdAt
        updatedAt
        v2ContentMetadataAliasId
        v2ContentMetadataSeriesId
        __typename
      }
      status
      createdAt
      updatedAt
      aliasV2ContentMetadataId
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
      contentMetadatas {
        nextToken
        __typename
      }
      v2ContentMetadatas {
        nextToken
        __typename
      }
      proSupportMessages {
        nextToken
        __typename
      }
      favorites
      seriesContributions {
        nextToken
        __typename
      }
      seasonContributions {
        nextToken
        __typename
      }
      episodeContributions {
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
      contentMetadatas {
        nextToken
        __typename
      }
      v2ContentMetadatas {
        nextToken
        __typename
      }
      proSupportMessages {
        nextToken
        __typename
      }
      favorites
      seriesContributions {
        nextToken
        __typename
      }
      seasonContributions {
        nextToken
        __typename
      }
      episodeContributions {
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
      contentMetadatas {
        nextToken
        __typename
      }
      v2ContentMetadatas {
        nextToken
        __typename
      }
      proSupportMessages {
        nextToken
        __typename
      }
      favorites
      seriesContributions {
        nextToken
        __typename
      }
      seasonContributions {
        nextToken
        __typename
      }
      episodeContributions {
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
        favorites
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
        favorites
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
        favorites
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
        favorites
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
        favorites
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
        favorites
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
        favorites
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
        favorites
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
        favorites
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
        favorites
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
        favorites
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
        favorites
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      prompt
      results
      error
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      prompt
      results
      error
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      prompt
      results
      error
      createdAt
      updatedAt
      magicResultUserId
      __typename
    }
  }
`;
export const onCreateTemplate = /* GraphQL */ `
  subscription OnCreateTemplate(
    $filter: ModelSubscriptionTemplateFilterInput
    $owner: String
  ) {
    onCreateTemplate(filter: $filter, owner: $owner) {
      id
      ownerIdentityId
      name
      state
      snapshotKey
      snapshotVersion
      thumbnailKey
      thumbnailSignature
      thumbnailUpdatedAt
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onUpdateTemplate = /* GraphQL */ `
  subscription OnUpdateTemplate(
    $filter: ModelSubscriptionTemplateFilterInput
    $owner: String
  ) {
    onUpdateTemplate(filter: $filter, owner: $owner) {
      id
      ownerIdentityId
      name
      state
      snapshotKey
      snapshotVersion
      thumbnailKey
      thumbnailSignature
      thumbnailUpdatedAt
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onDeleteTemplate = /* GraphQL */ `
  subscription OnDeleteTemplate(
    $filter: ModelSubscriptionTemplateFilterInput
    $owner: String
  ) {
    onDeleteTemplate(filter: $filter, owner: $owner) {
      id
      ownerIdentityId
      name
      state
      snapshotKey
      snapshotVersion
      thumbnailKey
      thumbnailSignature
      thumbnailUpdatedAt
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onCreateEditorProject = /* GraphQL */ `
  subscription OnCreateEditorProject(
    $filter: ModelSubscriptionEditorProjectFilterInput
  ) {
    onCreateEditorProject(filter: $filter) {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      title
      state
      createdAt
      updatedAt
      editorProjectUserId
      __typename
    }
  }
`;
export const onUpdateEditorProject = /* GraphQL */ `
  subscription OnUpdateEditorProject(
    $filter: ModelSubscriptionEditorProjectFilterInput
  ) {
    onUpdateEditorProject(filter: $filter) {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      title
      state
      createdAt
      updatedAt
      editorProjectUserId
      __typename
    }
  }
`;
export const onDeleteEditorProject = /* GraphQL */ `
  subscription OnDeleteEditorProject(
    $filter: ModelSubscriptionEditorProjectFilterInput
  ) {
    onDeleteEditorProject(filter: $filter) {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      title
      state
      createdAt
      updatedAt
      editorProjectUserId
      __typename
    }
  }
`;
export const onCreateWebsiteSetting = /* GraphQL */ `
  subscription OnCreateWebsiteSetting(
    $filter: ModelSubscriptionWebsiteSettingFilterInput
  ) {
    onCreateWebsiteSetting(filter: $filter) {
      id
      fullSiteMaintenance
      universalSearchMaintenance
      openAIRateLimit
      nanoBananaRateLimit
      moderationThreshold
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateWebsiteSetting = /* GraphQL */ `
  subscription OnUpdateWebsiteSetting(
    $filter: ModelSubscriptionWebsiteSettingFilterInput
  ) {
    onUpdateWebsiteSetting(filter: $filter) {
      id
      fullSiteMaintenance
      universalSearchMaintenance
      openAIRateLimit
      nanoBananaRateLimit
      moderationThreshold
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteWebsiteSetting = /* GraphQL */ `
  subscription OnDeleteWebsiteSetting(
    $filter: ModelSubscriptionWebsiteSettingFilterInput
  ) {
    onDeleteWebsiteSetting(filter: $filter) {
      id
      fullSiteMaintenance
      universalSearchMaintenance
      openAIRateLimit
      nanoBananaRateLimit
      moderationThreshold
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateProSupportMessage = /* GraphQL */ `
  subscription OnCreateProSupportMessage(
    $filter: ModelSubscriptionProSupportMessageFilterInput
  ) {
    onCreateProSupportMessage(filter: $filter) {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      message
      createdAt
      updatedAt
      userDetailsProSupportMessagesId
      __typename
    }
  }
`;
export const onUpdateProSupportMessage = /* GraphQL */ `
  subscription OnUpdateProSupportMessage(
    $filter: ModelSubscriptionProSupportMessageFilterInput
  ) {
    onUpdateProSupportMessage(filter: $filter) {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      message
      createdAt
      updatedAt
      userDetailsProSupportMessagesId
      __typename
    }
  }
`;
export const onDeleteProSupportMessage = /* GraphQL */ `
  subscription OnDeleteProSupportMessage(
    $filter: ModelSubscriptionProSupportMessageFilterInput
  ) {
    onDeleteProSupportMessage(filter: $filter) {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      message
      createdAt
      updatedAt
      userDetailsProSupportMessagesId
      __typename
    }
  }
`;
export const onCreateUsageEvent = /* GraphQL */ `
  subscription OnCreateUsageEvent(
    $filter: ModelSubscriptionUsageEventFilterInput
    $identityId: String
  ) {
    onCreateUsageEvent(filter: $filter, identityId: $identityId) {
      id
      identityId
      eventType
      eventData
      sessionId
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateUsageEvent = /* GraphQL */ `
  subscription OnUpdateUsageEvent(
    $filter: ModelSubscriptionUsageEventFilterInput
    $identityId: String
  ) {
    onUpdateUsageEvent(filter: $filter, identityId: $identityId) {
      id
      identityId
      eventType
      eventData
      sessionId
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteUsageEvent = /* GraphQL */ `
  subscription OnDeleteUsageEvent(
    $filter: ModelSubscriptionUsageEventFilterInput
    $identityId: String
  ) {
    onDeleteUsageEvent(filter: $filter, identityId: $identityId) {
      id
      identityId
      eventType
      eventData
      sessionId
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateLocationLeads = /* GraphQL */ `
  subscription OnCreateLocationLeads(
    $filter: ModelSubscriptionLocationLeadsFilterInput
  ) {
    onCreateLocationLeads(filter: $filter) {
      id
      countryCode
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onUpdateLocationLeads = /* GraphQL */ `
  subscription OnUpdateLocationLeads(
    $filter: ModelSubscriptionLocationLeadsFilterInput
  ) {
    onUpdateLocationLeads(filter: $filter) {
      id
      countryCode
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onDeleteLocationLeads = /* GraphQL */ `
  subscription OnDeleteLocationLeads(
    $filter: ModelSubscriptionLocationLeadsFilterInput
  ) {
    onDeleteLocationLeads(filter: $filter) {
      id
      countryCode
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const onCreateSearchFilterGroup = /* GraphQL */ `
  subscription OnCreateSearchFilterGroup(
    $filter: ModelSubscriptionSearchFilterGroupFilterInput
    $owner: String
  ) {
    onCreateSearchFilterGroup(filter: $filter, owner: $owner) {
      id
      name
      filters
      owner
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateSearchFilterGroup = /* GraphQL */ `
  subscription OnUpdateSearchFilterGroup(
    $filter: ModelSubscriptionSearchFilterGroupFilterInput
    $owner: String
  ) {
    onUpdateSearchFilterGroup(filter: $filter, owner: $owner) {
      id
      name
      filters
      owner
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteSearchFilterGroup = /* GraphQL */ `
  subscription OnDeleteSearchFilterGroup(
    $filter: ModelSubscriptionSearchFilterGroupFilterInput
    $owner: String
  ) {
    onDeleteSearchFilterGroup(filter: $filter, owner: $owner) {
      id
      name
      filters
      owner
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateMagicEditHistory = /* GraphQL */ `
  subscription OnCreateMagicEditHistory(
    $filter: ModelSubscriptionMagicEditHistoryFilterInput
    $owner: String
  ) {
    onCreateMagicEditHistory(filter: $filter, owner: $owner) {
      id
      prompt
      imageKey
      imageUrl
      metadata
      status
      createdAt
      owner
      updatedAt
      __typename
    }
  }
`;
export const onUpdateMagicEditHistory = /* GraphQL */ `
  subscription OnUpdateMagicEditHistory(
    $filter: ModelSubscriptionMagicEditHistoryFilterInput
    $owner: String
  ) {
    onUpdateMagicEditHistory(filter: $filter, owner: $owner) {
      id
      prompt
      imageKey
      imageUrl
      metadata
      status
      createdAt
      owner
      updatedAt
      __typename
    }
  }
`;
export const onDeleteMagicEditHistory = /* GraphQL */ `
  subscription OnDeleteMagicEditHistory(
    $filter: ModelSubscriptionMagicEditHistoryFilterInput
    $owner: String
  ) {
    onDeleteMagicEditHistory(filter: $filter, owner: $owner) {
      id
      prompt
      imageKey
      imageUrl
      metadata
      status
      createdAt
      owner
      updatedAt
      __typename
    }
  }
`;
export const onCreateRateLimit = /* GraphQL */ `
  subscription OnCreateRateLimit(
    $filter: ModelSubscriptionRateLimitFilterInput
  ) {
    onCreateRateLimit(filter: $filter) {
      id
      currentUsage
      openaiUsage
      geminiUsage
      adminAlerts
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateRateLimit = /* GraphQL */ `
  subscription OnUpdateRateLimit(
    $filter: ModelSubscriptionRateLimitFilterInput
  ) {
    onUpdateRateLimit(filter: $filter) {
      id
      currentUsage
      openaiUsage
      geminiUsage
      adminAlerts
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteRateLimit = /* GraphQL */ `
  subscription OnDeleteRateLimit(
    $filter: ModelSubscriptionRateLimitFilterInput
  ) {
    onDeleteRateLimit(filter: $filter) {
      id
      currentUsage
      openaiUsage
      geminiUsage
      adminAlerts
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateSeriesContributors = /* GraphQL */ `
  subscription OnCreateSeriesContributors(
    $filter: ModelSubscriptionSeriesContributorsFilterInput
  ) {
    onCreateSeriesContributors(filter: $filter) {
      id
      seriesId
      userDetailsId
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
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateSeriesContributors = /* GraphQL */ `
  subscription OnUpdateSeriesContributors(
    $filter: ModelSubscriptionSeriesContributorsFilterInput
  ) {
    onUpdateSeriesContributors(filter: $filter) {
      id
      seriesId
      userDetailsId
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
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteSeriesContributors = /* GraphQL */ `
  subscription OnDeleteSeriesContributors(
    $filter: ModelSubscriptionSeriesContributorsFilterInput
  ) {
    onDeleteSeriesContributors(filter: $filter) {
      id
      seriesId
      userDetailsId
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
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateSeasonContributors = /* GraphQL */ `
  subscription OnCreateSeasonContributors(
    $filter: ModelSubscriptionSeasonContributorsFilterInput
  ) {
    onCreateSeasonContributors(filter: $filter) {
      id
      seasonId
      userDetailsId
      season {
        id
        tvdbid
        year
        image
        description
        seasonNumber
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateSeasonContributors = /* GraphQL */ `
  subscription OnUpdateSeasonContributors(
    $filter: ModelSubscriptionSeasonContributorsFilterInput
  ) {
    onUpdateSeasonContributors(filter: $filter) {
      id
      seasonId
      userDetailsId
      season {
        id
        tvdbid
        year
        image
        description
        seasonNumber
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteSeasonContributors = /* GraphQL */ `
  subscription OnDeleteSeasonContributors(
    $filter: ModelSubscriptionSeasonContributorsFilterInput
  ) {
    onDeleteSeasonContributors(filter: $filter) {
      id
      seasonId
      userDetailsId
      season {
        id
        tvdbid
        year
        image
        description
        seasonNumber
        createdAt
        updatedAt
        seriesSeasonsId
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateEpisodeContributors = /* GraphQL */ `
  subscription OnCreateEpisodeContributors(
    $filter: ModelSubscriptionEpisodeContributorsFilterInput
  ) {
    onCreateEpisodeContributors(filter: $filter) {
      id
      episodeId
      userDetailsId
      episode {
        id
        tvdbid
        year
        image
        description
        episodeNumber
        name
        createdAt
        updatedAt
        seasonEpisodesId
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateEpisodeContributors = /* GraphQL */ `
  subscription OnUpdateEpisodeContributors(
    $filter: ModelSubscriptionEpisodeContributorsFilterInput
  ) {
    onUpdateEpisodeContributors(filter: $filter) {
      id
      episodeId
      userDetailsId
      episode {
        id
        tvdbid
        year
        image
        description
        episodeNumber
        name
        createdAt
        updatedAt
        seasonEpisodesId
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteEpisodeContributors = /* GraphQL */ `
  subscription OnDeleteEpisodeContributors(
    $filter: ModelSubscriptionEpisodeContributorsFilterInput
  ) {
    onDeleteEpisodeContributors(filter: $filter) {
      id
      episodeId
      userDetailsId
      episode {
        id
        tvdbid
        year
        image
        description
        episodeNumber
        name
        createdAt
        updatedAt
        seasonEpisodesId
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateUserMetadata = /* GraphQL */ `
  subscription OnCreateUserMetadata(
    $filter: ModelSubscriptionUserMetadataFilterInput
  ) {
    onCreateUserMetadata(filter: $filter) {
      id
      contentMetadataId
      userDetailsId
      contentMetadata {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        version
        createdAt
        updatedAt
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateUserMetadata = /* GraphQL */ `
  subscription OnUpdateUserMetadata(
    $filter: ModelSubscriptionUserMetadataFilterInput
  ) {
    onUpdateUserMetadata(filter: $filter) {
      id
      contentMetadataId
      userDetailsId
      contentMetadata {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        version
        createdAt
        updatedAt
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteUserMetadata = /* GraphQL */ `
  subscription OnDeleteUserMetadata(
    $filter: ModelSubscriptionUserMetadataFilterInput
  ) {
    onDeleteUserMetadata(filter: $filter) {
      id
      contentMetadataId
      userDetailsId
      contentMetadata {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        version
        createdAt
        updatedAt
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onCreateUserV2Metadata = /* GraphQL */ `
  subscription OnCreateUserV2Metadata(
    $filter: ModelSubscriptionUserV2MetadataFilterInput
  ) {
    onCreateUserV2Metadata(filter: $filter) {
      id
      v2ContentMetadataId
      userDetailsId
      v2ContentMetadata {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        version
        fontFamily
        createdAt
        updatedAt
        v2ContentMetadataAliasId
        v2ContentMetadataSeriesId
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateUserV2Metadata = /* GraphQL */ `
  subscription OnUpdateUserV2Metadata(
    $filter: ModelSubscriptionUserV2MetadataFilterInput
  ) {
    onUpdateUserV2Metadata(filter: $filter) {
      id
      v2ContentMetadataId
      userDetailsId
      v2ContentMetadata {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        version
        fontFamily
        createdAt
        updatedAt
        v2ContentMetadataAliasId
        v2ContentMetadataSeriesId
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteUserV2Metadata = /* GraphQL */ `
  subscription OnDeleteUserV2Metadata(
    $filter: ModelSubscriptionUserV2MetadataFilterInput
  ) {
    onDeleteUserV2Metadata(filter: $filter) {
      id
      v2ContentMetadataId
      userDetailsId
      v2ContentMetadata {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        version
        fontFamily
        createdAt
        updatedAt
        v2ContentMetadataAliasId
        v2ContentMetadataSeriesId
        __typename
      }
      userDetails {
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
        favorites
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
