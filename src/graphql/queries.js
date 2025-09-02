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
export const seriesByTvdbid = /* GraphQL */ `
  query SeriesByTvdbid(
    $tvdbid: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelSeriesFilterInput
    $limit: Int
    $nextToken: String
  ) {
    seriesByTvdbid(
      tvdbid: $tvdbid
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
export const listSourceMedias = /* GraphQL */ `
  query ListSourceMedias(
    $filter: ModelSourceMediaFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSourceMedias(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        status
        pendingAlias
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
export const listFiles = /* GraphQL */ `
  query ListFiles(
    $filter: ModelFileFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listFiles(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        key
        unzippedPath
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
        version
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const contentMetadataByStatus = /* GraphQL */ `
  query ContentMetadataByStatus(
    $status: Int!
    $sortDirection: ModelSortDirection
    $filter: ModelContentMetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    contentMetadataByStatus(
      status: $status
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
      nextToken
      __typename
    }
  }
`;
export const getFavorite = /* GraphQL */ `
  query GetFavorite($id: ID!) {
    getFavorite(id: $id) {
      id
      owner
      cid
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listFavorites = /* GraphQL */ `
  query ListFavorites(
    $filter: ModelFavoriteFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listFavorites(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        owner
        cid
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getV2ContentMetadata = /* GraphQL */ `
  query GetV2ContentMetadata($id: ID!) {
    getV2ContentMetadata(id: $id) {
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
      createdAt
      updatedAt
      v2ContentMetadataAliasId
      __typename
    }
  }
`;
export const listV2ContentMetadata = /* GraphQL */ `
  query ListV2ContentMetadata(
    $filter: ModelV2ContentMetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listV2ContentMetadata(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const v2ContentMetadataByStatus = /* GraphQL */ `
  query V2ContentMetadataByStatus(
    $status: Int!
    $sortDirection: ModelSortDirection
    $filter: ModelV2ContentMetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    v2ContentMetadataByStatus(
      status: $status
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getAlias = /* GraphQL */ `
  query GetAlias($id: ID!) {
    getAlias(id: $id) {
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
        __typename
      }
      createdAt
      updatedAt
      aliasV2ContentMetadataId
      __typename
    }
  }
`;
export const listAliases = /* GraphQL */ `
  query ListAliases(
    $filter: ModelAliasFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listAliases(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        createdAt
        updatedAt
        aliasV2ContentMetadataId
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
      createdAt
      updatedAt
      userDetailsStripeCustomerInfoId
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
      nextToken
      __typename
    }
  }
`;
export const getStripeCustomer = /* GraphQL */ `
  query GetStripeCustomer($id: ID!) {
    getStripeCustomer(id: $id) {
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
export const listStripeCustomers = /* GraphQL */ `
  query ListStripeCustomers(
    $filter: ModelStripeCustomerFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listStripeCustomers(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        createdAt
        updatedAt
        stripeCustomerUserId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getStripeCheckoutSession = /* GraphQL */ `
  query GetStripeCheckoutSession($id: ID!) {
    getStripeCheckoutSession(id: $id) {
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
export const listStripeCheckoutSessions = /* GraphQL */ `
  query ListStripeCheckoutSessions(
    $filter: ModelStripeCheckoutSessionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listStripeCheckoutSessions(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        status
        createdAt
        updatedAt
        userDetailsStripeCheckoutSessionId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getSeriesUserVote = /* GraphQL */ `
  query GetSeriesUserVote($id: ID!) {
    getSeriesUserVote(id: $id) {
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
export const listSeriesUserVotes = /* GraphQL */ `
  query ListSeriesUserVotes(
    $filter: ModelSeriesUserVoteFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSeriesUserVotes(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        boost
        createdAt
        updatedAt
        userDetailsVotesId
        seriesUserVoteSeriesId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getUserNotification = /* GraphQL */ `
  query GetUserNotification($id: ID!) {
    getUserNotification(id: $id) {
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
export const listUserNotifications = /* GraphQL */ `
  query ListUserNotifications(
    $filter: ModelUserNotificationFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUserNotifications(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
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
      nextToken
      __typename
    }
  }
`;
export const getFrameSubtitle = /* GraphQL */ `
  query GetFrameSubtitle($id: ID!) {
    getFrameSubtitle(id: $id) {
      id
      subtitle
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listFrameSubtitles = /* GraphQL */ `
  query ListFrameSubtitles(
    $filter: ModelFrameSubtitleFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listFrameSubtitles(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        subtitle
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getMagicResult = /* GraphQL */ `
  query GetMagicResult($id: ID!) {
    getMagicResult(id: $id) {
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
export const listMagicResults = /* GraphQL */ `
  query ListMagicResults(
    $filter: ModelMagicResultFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listMagicResults(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        prompt
        results
        createdAt
        updatedAt
        magicResultUserId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getEditorProject = /* GraphQL */ `
  query GetEditorProject($id: ID!) {
    getEditorProject(id: $id) {
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
export const listEditorProjects = /* GraphQL */ `
  query ListEditorProjects(
    $filter: ModelEditorProjectFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listEditorProjects(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        state
        createdAt
        updatedAt
        editorProjectUserId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getWebsiteSetting = /* GraphQL */ `
  query GetWebsiteSetting($id: ID!) {
    getWebsiteSetting(id: $id) {
      id
      fullSiteMaintenance
      universalSearchMaintenance
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listWebsiteSettings = /* GraphQL */ `
  query ListWebsiteSettings(
    $filter: ModelWebsiteSettingFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listWebsiteSettings(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        fullSiteMaintenance
        universalSearchMaintenance
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getProSupportMessage = /* GraphQL */ `
  query GetProSupportMessage($id: ID!) {
    getProSupportMessage(id: $id) {
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
export const listProSupportMessages = /* GraphQL */ `
  query ListProSupportMessages(
    $filter: ModelProSupportMessageFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listProSupportMessages(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        message
        createdAt
        updatedAt
        userDetailsProSupportMessagesId
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getLocationLeads = /* GraphQL */ `
  query GetLocationLeads($id: ID!) {
    getLocationLeads(id: $id) {
      id
      countryCode
      createdAt
      updatedAt
      owner
      __typename
    }
  }
`;
export const listLocationLeads = /* GraphQL */ `
  query ListLocationLeads(
    $filter: ModelLocationLeadsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listLocationLeads(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        countryCode
        createdAt
        updatedAt
        owner
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getUserMetadata = /* GraphQL */ `
  query GetUserMetadata($id: ID!) {
    getUserMetadata(id: $id) {
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
export const listUserMetadata = /* GraphQL */ `
  query ListUserMetadata(
    $filter: ModelUserMetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUserMetadata(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        contentMetadataId
        userDetailsId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const userMetadataByContentMetadataId = /* GraphQL */ `
  query UserMetadataByContentMetadataId(
    $contentMetadataId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelUserMetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    userMetadataByContentMetadataId(
      contentMetadataId: $contentMetadataId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        contentMetadataId
        userDetailsId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const userMetadataByUserDetailsId = /* GraphQL */ `
  query UserMetadataByUserDetailsId(
    $userDetailsId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelUserMetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    userMetadataByUserDetailsId(
      userDetailsId: $userDetailsId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        contentMetadataId
        userDetailsId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getUserV2Metadata = /* GraphQL */ `
  query GetUserV2Metadata($id: ID!) {
    getUserV2Metadata(id: $id) {
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
export const listUserV2Metadata = /* GraphQL */ `
  query ListUserV2Metadata(
    $filter: ModelUserV2MetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUserV2Metadata(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        v2ContentMetadataId
        userDetailsId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const userV2MetadataByV2ContentMetadataId = /* GraphQL */ `
  query UserV2MetadataByV2ContentMetadataId(
    $v2ContentMetadataId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelUserV2MetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    userV2MetadataByV2ContentMetadataId(
      v2ContentMetadataId: $v2ContentMetadataId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        v2ContentMetadataId
        userDetailsId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const userV2MetadataByUserDetailsId = /* GraphQL */ `
  query UserV2MetadataByUserDetailsId(
    $userDetailsId: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelUserV2MetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    userV2MetadataByUserDetailsId(
      userDetailsId: $userDetailsId
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        v2ContentMetadataId
        userDetailsId
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
