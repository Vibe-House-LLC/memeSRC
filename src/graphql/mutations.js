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
      pendingAlias
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
      pendingAlias
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
      pendingAlias
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
        status
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
        status
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
        status
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
export const createFavorite = /* GraphQL */ `
  mutation CreateFavorite(
    $input: CreateFavoriteInput!
    $condition: ModelFavoriteConditionInput
  ) {
    createFavorite(input: $input, condition: $condition) {
      id
      owner
      cid
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateFavorite = /* GraphQL */ `
  mutation UpdateFavorite(
    $input: UpdateFavoriteInput!
    $condition: ModelFavoriteConditionInput
  ) {
    updateFavorite(input: $input, condition: $condition) {
      id
      owner
      cid
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteFavorite = /* GraphQL */ `
  mutation DeleteFavorite(
    $input: DeleteFavoriteInput!
    $condition: ModelFavoriteConditionInput
  ) {
    deleteFavorite(input: $input, condition: $condition) {
      id
      owner
      cid
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createV2ContentMetadata = /* GraphQL */ `
  mutation CreateV2ContentMetadata(
    $input: CreateV2ContentMetadataInput!
    $condition: ModelV2ContentMetadataConditionInput
  ) {
    createV2ContentMetadata(input: $input, condition: $condition) {
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
export const updateV2ContentMetadata = /* GraphQL */ `
  mutation UpdateV2ContentMetadata(
    $input: UpdateV2ContentMetadataInput!
    $condition: ModelV2ContentMetadataConditionInput
  ) {
    updateV2ContentMetadata(input: $input, condition: $condition) {
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
export const deleteV2ContentMetadata = /* GraphQL */ `
  mutation DeleteV2ContentMetadata(
    $input: DeleteV2ContentMetadataInput!
    $condition: ModelV2ContentMetadataConditionInput
  ) {
    deleteV2ContentMetadata(input: $input, condition: $condition) {
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
export const createAlias = /* GraphQL */ `
  mutation CreateAlias(
    $input: CreateAliasInput!
    $condition: ModelAliasConditionInput
  ) {
    createAlias(input: $input, condition: $condition) {
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
      createdAt
      updatedAt
      aliasV2ContentMetadataId
      __typename
    }
  }
`;
export const updateAlias = /* GraphQL */ `
  mutation UpdateAlias(
    $input: UpdateAliasInput!
    $condition: ModelAliasConditionInput
  ) {
    updateAlias(input: $input, condition: $condition) {
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
      createdAt
      updatedAt
      aliasV2ContentMetadataId
      __typename
    }
  }
`;
export const deleteAlias = /* GraphQL */ `
  mutation DeleteAlias(
    $input: DeleteAliasInput!
    $condition: ModelAliasConditionInput
  ) {
    deleteAlias(input: $input, condition: $condition) {
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
      createdAt
      updatedAt
      aliasV2ContentMetadataId
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
export const updateUserDetails = /* GraphQL */ `
  mutation UpdateUserDetails(
    $input: UpdateUserDetailsInput!
    $condition: ModelUserDetailsConditionInput
  ) {
    updateUserDetails(input: $input, condition: $condition) {
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
export const deleteUserDetails = /* GraphQL */ `
  mutation DeleteUserDetails(
    $input: DeleteUserDetailsInput!
    $condition: ModelUserDetailsConditionInput
  ) {
    deleteUserDetails(input: $input, condition: $condition) {
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
export const createStripeCustomer = /* GraphQL */ `
  mutation CreateStripeCustomer(
    $input: CreateStripeCustomerInput!
    $condition: ModelStripeCustomerConditionInput
  ) {
    createStripeCustomer(input: $input, condition: $condition) {
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
export const updateStripeCustomer = /* GraphQL */ `
  mutation UpdateStripeCustomer(
    $input: UpdateStripeCustomerInput!
    $condition: ModelStripeCustomerConditionInput
  ) {
    updateStripeCustomer(input: $input, condition: $condition) {
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
export const deleteStripeCustomer = /* GraphQL */ `
  mutation DeleteStripeCustomer(
    $input: DeleteStripeCustomerInput!
    $condition: ModelStripeCustomerConditionInput
  ) {
    deleteStripeCustomer(input: $input, condition: $condition) {
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
export const createStripeCheckoutSession = /* GraphQL */ `
  mutation CreateStripeCheckoutSession(
    $input: CreateStripeCheckoutSessionInput!
    $condition: ModelStripeCheckoutSessionConditionInput
  ) {
    createStripeCheckoutSession(input: $input, condition: $condition) {
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
export const updateStripeCheckoutSession = /* GraphQL */ `
  mutation UpdateStripeCheckoutSession(
    $input: UpdateStripeCheckoutSessionInput!
    $condition: ModelStripeCheckoutSessionConditionInput
  ) {
    updateStripeCheckoutSession(input: $input, condition: $condition) {
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
export const deleteStripeCheckoutSession = /* GraphQL */ `
  mutation DeleteStripeCheckoutSession(
    $input: DeleteStripeCheckoutSessionInput!
    $condition: ModelStripeCheckoutSessionConditionInput
  ) {
    deleteStripeCheckoutSession(input: $input, condition: $condition) {
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
export const createUserNotification = /* GraphQL */ `
  mutation CreateUserNotification(
    $input: CreateUserNotificationInput!
    $condition: ModelUserNotificationConditionInput
  ) {
    createUserNotification(input: $input, condition: $condition) {
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
export const updateUserNotification = /* GraphQL */ `
  mutation UpdateUserNotification(
    $input: UpdateUserNotificationInput!
    $condition: ModelUserNotificationConditionInput
  ) {
    updateUserNotification(input: $input, condition: $condition) {
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
export const deleteUserNotification = /* GraphQL */ `
  mutation DeleteUserNotification(
    $input: DeleteUserNotificationInput!
    $condition: ModelUserNotificationConditionInput
  ) {
    deleteUserNotification(input: $input, condition: $condition) {
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
export const createFrameSubtitle = /* GraphQL */ `
  mutation CreateFrameSubtitle(
    $input: CreateFrameSubtitleInput!
    $condition: ModelFrameSubtitleConditionInput
  ) {
    createFrameSubtitle(input: $input, condition: $condition) {
      id
      subtitle
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateFrameSubtitle = /* GraphQL */ `
  mutation UpdateFrameSubtitle(
    $input: UpdateFrameSubtitleInput!
    $condition: ModelFrameSubtitleConditionInput
  ) {
    updateFrameSubtitle(input: $input, condition: $condition) {
      id
      subtitle
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteFrameSubtitle = /* GraphQL */ `
  mutation DeleteFrameSubtitle(
    $input: DeleteFrameSubtitleInput!
    $condition: ModelFrameSubtitleConditionInput
  ) {
    deleteFrameSubtitle(input: $input, condition: $condition) {
      id
      subtitle
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createMagicResult = /* GraphQL */ `
  mutation CreateMagicResult(
    $input: CreateMagicResultInput!
    $condition: ModelMagicResultConditionInput
  ) {
    createMagicResult(input: $input, condition: $condition) {
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
      createdAt
      updatedAt
      magicResultUserId
      __typename
    }
  }
`;
export const updateMagicResult = /* GraphQL */ `
  mutation UpdateMagicResult(
    $input: UpdateMagicResultInput!
    $condition: ModelMagicResultConditionInput
  ) {
    updateMagicResult(input: $input, condition: $condition) {
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
      createdAt
      updatedAt
      magicResultUserId
      __typename
    }
  }
`;
export const deleteMagicResult = /* GraphQL */ `
  mutation DeleteMagicResult(
    $input: DeleteMagicResultInput!
    $condition: ModelMagicResultConditionInput
  ) {
    deleteMagicResult(input: $input, condition: $condition) {
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
      createdAt
      updatedAt
      magicResultUserId
      __typename
    }
  }
`;
export const createEditorProject = /* GraphQL */ `
  mutation CreateEditorProject(
    $input: CreateEditorProjectInput!
    $condition: ModelEditorProjectConditionInput
  ) {
    createEditorProject(input: $input, condition: $condition) {
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
export const updateEditorProject = /* GraphQL */ `
  mutation UpdateEditorProject(
    $input: UpdateEditorProjectInput!
    $condition: ModelEditorProjectConditionInput
  ) {
    updateEditorProject(input: $input, condition: $condition) {
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
export const deleteEditorProject = /* GraphQL */ `
  mutation DeleteEditorProject(
    $input: DeleteEditorProjectInput!
    $condition: ModelEditorProjectConditionInput
  ) {
    deleteEditorProject(input: $input, condition: $condition) {
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
export const createWebsiteSetting = /* GraphQL */ `
  mutation CreateWebsiteSetting(
    $input: CreateWebsiteSettingInput!
    $condition: ModelWebsiteSettingConditionInput
  ) {
    createWebsiteSetting(input: $input, condition: $condition) {
      id
      fullSiteMaintenance
      universalSearchMaintenance
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateWebsiteSetting = /* GraphQL */ `
  mutation UpdateWebsiteSetting(
    $input: UpdateWebsiteSettingInput!
    $condition: ModelWebsiteSettingConditionInput
  ) {
    updateWebsiteSetting(input: $input, condition: $condition) {
      id
      fullSiteMaintenance
      universalSearchMaintenance
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteWebsiteSetting = /* GraphQL */ `
  mutation DeleteWebsiteSetting(
    $input: DeleteWebsiteSettingInput!
    $condition: ModelWebsiteSettingConditionInput
  ) {
    deleteWebsiteSetting(input: $input, condition: $condition) {
      id
      fullSiteMaintenance
      universalSearchMaintenance
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createProSupportMessage = /* GraphQL */ `
  mutation CreateProSupportMessage(
    $input: CreateProSupportMessageInput!
    $condition: ModelProSupportMessageConditionInput
  ) {
    createProSupportMessage(input: $input, condition: $condition) {
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
export const updateProSupportMessage = /* GraphQL */ `
  mutation UpdateProSupportMessage(
    $input: UpdateProSupportMessageInput!
    $condition: ModelProSupportMessageConditionInput
  ) {
    updateProSupportMessage(input: $input, condition: $condition) {
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
export const deleteProSupportMessage = /* GraphQL */ `
  mutation DeleteProSupportMessage(
    $input: DeleteProSupportMessageInput!
    $condition: ModelProSupportMessageConditionInput
  ) {
    deleteProSupportMessage(input: $input, condition: $condition) {
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
export const createUsageEvent = /* GraphQL */ `
  mutation CreateUsageEvent(
    $input: CreateUsageEventInput!
    $condition: ModelUsageEventConditionInput
  ) {
    createUsageEvent(input: $input, condition: $condition) {
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
export const updateUsageEvent = /* GraphQL */ `
  mutation UpdateUsageEvent(
    $input: UpdateUsageEventInput!
    $condition: ModelUsageEventConditionInput
  ) {
    updateUsageEvent(input: $input, condition: $condition) {
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
export const deleteUsageEvent = /* GraphQL */ `
  mutation DeleteUsageEvent(
    $input: DeleteUsageEventInput!
    $condition: ModelUsageEventConditionInput
  ) {
    deleteUsageEvent(input: $input, condition: $condition) {
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
export const createLocationLeads = /* GraphQL */ `
  mutation CreateLocationLeads(
    $input: CreateLocationLeadsInput!
    $condition: ModelLocationLeadsConditionInput
  ) {
    createLocationLeads(input: $input, condition: $condition) {
      id
      countryCode
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const updateLocationLeads = /* GraphQL */ `
  mutation UpdateLocationLeads(
    $input: UpdateLocationLeadsInput!
    $condition: ModelLocationLeadsConditionInput
  ) {
    updateLocationLeads(input: $input, condition: $condition) {
      id
      countryCode
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const deleteLocationLeads = /* GraphQL */ `
  mutation DeleteLocationLeads(
    $input: DeleteLocationLeadsInput!
    $condition: ModelLocationLeadsConditionInput
  ) {
    deleteLocationLeads(input: $input, condition: $condition) {
      id
      countryCode
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const createSeriesContributors = /* GraphQL */ `
  mutation CreateSeriesContributors(
    $input: CreateSeriesContributorsInput!
    $condition: ModelSeriesContributorsConditionInput
  ) {
    createSeriesContributors(input: $input, condition: $condition) {
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
export const updateSeriesContributors = /* GraphQL */ `
  mutation UpdateSeriesContributors(
    $input: UpdateSeriesContributorsInput!
    $condition: ModelSeriesContributorsConditionInput
  ) {
    updateSeriesContributors(input: $input, condition: $condition) {
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
export const deleteSeriesContributors = /* GraphQL */ `
  mutation DeleteSeriesContributors(
    $input: DeleteSeriesContributorsInput!
    $condition: ModelSeriesContributorsConditionInput
  ) {
    deleteSeriesContributors(input: $input, condition: $condition) {
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
export const createSeasonContributors = /* GraphQL */ `
  mutation CreateSeasonContributors(
    $input: CreateSeasonContributorsInput!
    $condition: ModelSeasonContributorsConditionInput
  ) {
    createSeasonContributors(input: $input, condition: $condition) {
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
export const updateSeasonContributors = /* GraphQL */ `
  mutation UpdateSeasonContributors(
    $input: UpdateSeasonContributorsInput!
    $condition: ModelSeasonContributorsConditionInput
  ) {
    updateSeasonContributors(input: $input, condition: $condition) {
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
export const deleteSeasonContributors = /* GraphQL */ `
  mutation DeleteSeasonContributors(
    $input: DeleteSeasonContributorsInput!
    $condition: ModelSeasonContributorsConditionInput
  ) {
    deleteSeasonContributors(input: $input, condition: $condition) {
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
export const createEpisodeContributors = /* GraphQL */ `
  mutation CreateEpisodeContributors(
    $input: CreateEpisodeContributorsInput!
    $condition: ModelEpisodeContributorsConditionInput
  ) {
    createEpisodeContributors(input: $input, condition: $condition) {
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
export const updateEpisodeContributors = /* GraphQL */ `
  mutation UpdateEpisodeContributors(
    $input: UpdateEpisodeContributorsInput!
    $condition: ModelEpisodeContributorsConditionInput
  ) {
    updateEpisodeContributors(input: $input, condition: $condition) {
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
export const deleteEpisodeContributors = /* GraphQL */ `
  mutation DeleteEpisodeContributors(
    $input: DeleteEpisodeContributorsInput!
    $condition: ModelEpisodeContributorsConditionInput
  ) {
    deleteEpisodeContributors(input: $input, condition: $condition) {
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
export const createUserMetadata = /* GraphQL */ `
  mutation CreateUserMetadata(
    $input: CreateUserMetadataInput!
    $condition: ModelUserMetadataConditionInput
  ) {
    createUserMetadata(input: $input, condition: $condition) {
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
export const updateUserMetadata = /* GraphQL */ `
  mutation UpdateUserMetadata(
    $input: UpdateUserMetadataInput!
    $condition: ModelUserMetadataConditionInput
  ) {
    updateUserMetadata(input: $input, condition: $condition) {
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
export const deleteUserMetadata = /* GraphQL */ `
  mutation DeleteUserMetadata(
    $input: DeleteUserMetadataInput!
    $condition: ModelUserMetadataConditionInput
  ) {
    deleteUserMetadata(input: $input, condition: $condition) {
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
export const createUserV2Metadata = /* GraphQL */ `
  mutation CreateUserV2Metadata(
    $input: CreateUserV2MetadataInput!
    $condition: ModelUserV2MetadataConditionInput
  ) {
    createUserV2Metadata(input: $input, condition: $condition) {
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
export const updateUserV2Metadata = /* GraphQL */ `
  mutation UpdateUserV2Metadata(
    $input: UpdateUserV2MetadataInput!
    $condition: ModelUserV2MetadataConditionInput
  ) {
    updateUserV2Metadata(input: $input, condition: $condition) {
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
export const deleteUserV2Metadata = /* GraphQL */ `
  mutation DeleteUserV2Metadata(
    $input: DeleteUserV2MetadataInput!
    $condition: ModelUserV2MetadataConditionInput
  ) {
    deleteUserV2Metadata(input: $input, condition: $condition) {
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
