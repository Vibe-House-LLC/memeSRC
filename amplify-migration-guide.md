# AWS Amplify v5 to v6 Migration Guide - React (CRA) Applications

## Important Note for Developers

This guide has been prepared to help you migrate from AWS Amplify v5 to v6 with minimal external resources. Since you may have limited or no internet access while implementing these changes:

1. Follow the steps in this guide as closely as possible
2. Document any issues or blockers you encounter that you can't resolve
3. Feel free to make notes of specific questions for later follow-up
4. Proceed as far as you can with the information provided
5. If you hit a complete blocker, note it down with as much context as possible and we'll address it when you have access to more resources

This guide aims to be as self-contained as possible, but AWS Amplify v6 represents a significant architectural change that may require additional context in some situations.

This guide provides a comprehensive approach to migrate your AWS Amplify application from v5 to v6 for React applications built with Create React App (CRA). AWS Amplify v6 introduces significant architectural changes that require careful migration to ensure your application works correctly without compatibility layers.

**IMPORTANT**: This guide strictly follows a "no compatibility layers" approach, as requested. We will be implementing a clean migration to v6 without relying on any backward compatibility features.

## Table of Contents

1. [Understanding the Major Changes](#understanding-the-major-changes)
2. [Environment Requirements](#environment-requirements)
3. [Pre-Migration Steps](#pre-migration-steps)
4. [Updating Dependencies](#updating-dependencies)
5. [Configuration Changes](#configuration-changes)
6. [Category-Specific Migration Steps](#category-specific-migration-steps)
   - [Auth](#auth)
   - [API (GraphQL)](#api-graphql)
   - [API (REST)](#api-rest)
   - [Storage](#storage)
   - [Analytics](#analytics)
   - [Additional Categories](#additional-categories)
7. [Utility Migration](#utility-migration)
8. [Hub Events Migration](#hub-events-migration)
9. [Testing Strategy](#testing-strategy)
10. [Common Issues and Solutions](#common-issues-and-solutions)
11. [Final Checklist](#final-checklist)

## Understanding the Major Changes

AWS Amplify v6 introduces several architectural changes:

1. **Functional API Approach**: Most APIs now use a functional approach with named parameters instead of positional parameters.
2. **Granular Imports**: Import only the features you need from specific category paths.
3. **TypeScript Improvements**: Enhanced TypeScript support with strict mode enabled.
4. **Bundle Size Reduction**: Better tree-shaking for reduced bundle sizes.
5. **Named Parameters**: APIs now prefer named parameters for consistency and better type safety.

## Environment Requirements

Before starting the migration, ensure your development environment meets these requirements:

- Node.js 14.x or higher
- NPM 6.x or higher or Yarn 1.x or higher
- Amplify CLI 12.5.1 or higher (recommended)

```bash
# Update Amplify CLI
npm install -g @aws-amplify/cli@latest
```

## Pre-Migration Steps

1. **Create a backup**:
   ```bash
   git commit -am "Pre-migration backup"
   git checkout -b amplify-v6-migration
   ```

2. **Audit your Amplify usage**:
   Create an inventory of all Amplify categories used in your application:
   ```bash
   grep -r "import.*from.*aws-amplify" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" ./src
   ```

3. **Update Amplify CLI** (if you're using it):
   ```bash
   amplify upgrade
   ```

4. **Review current configuration**:
   Check your current Amplify configuration file.

## Updating Dependencies

Update your package.json with the following changes:

```bash
# Remove existing Amplify packages
npm uninstall aws-amplify @aws-amplify/auth @aws-amplify/api @aws-amplify/storage @aws-amplify/analytics @aws-amplify/pubsub @aws-amplify/interactions @aws-amplify/core @aws-amplify/ui-react

# Install v6 packages
npm install aws-amplify@^6.0.0 @aws-amplify/ui-react@^6.0.0
```

Note: Only install additional category-specific packages if needed for your application. For most applications, the core `aws-amplify` package will be sufficient.

## Configuration File Changes

Amplify v6 introduces important changes to configuration structure and handling that require special attention during migration.

### Configuration File Format

1. **New Configuration File**
   - V6 uses a new file called `amplifyconfiguration.json` instead of the older `aws-exports.js`
   - If your CLI version is older than 12.5.1, you'll need to upgrade and regenerate this file:
   ```bash
   amplify upgrade
   amplify pull
   ```

2. **Importing Configuration**
   ```javascript
   // V5
   import Amplify from 'aws-amplify';
   import awsconfig from './aws-exports';
   Amplify.configure(awsconfig);
   
   // V6
   import { Amplify } from 'aws-amplify';
   import config from './amplifyconfiguration.json';
   Amplify.configure(config);
   ```

### Category-Specific Configuration Structures

1. **Auth Configuration Changes**
   - Auth configuration in v6 uses more explicit nested structures:
   ```javascript
   // V5
   Auth: {
     region: 'us-east-1',
     userPoolId: 'us-east-1_example',
     userPoolWebClientId: 'abcdef123456',
     authenticationFlowType: 'USER_SRP_AUTH'
   }
   
   // V6
   Auth: {
     Cognito: {
       region: 'us-east-1',
       userPoolId: 'us-east-1_example',
       userPoolClientId: 'abcdef123456', // Note the different key name
       signUpVerificationMethod: 'code',
       loginWith: {
         email: true, 
         phone: true,
         username: false
       }
     }
   }
   ```

2. **Storage Configuration Changes**
   - Custom prefix handling has changed significantly:
   ```javascript
   // V5
   Storage: {
     AWSS3: {
       bucket: 'my-bucket',
       region: 'us-east-1',
       customPrefix: {
         public: 'public/',
         protected: 'protected/${identityId}/',
         private: 'private/${identityId}/'
       }
     }
   }
   
   // V6
   Storage: {
     S3: { // Note the different key name
       bucket: 'my-bucket',
       region: 'us-east-1'
     }
   }
   
   // For custom prefix in v6, add a prefixResolver in library options:
   const libraryOptions = {
     Storage: {
       S3: {
         prefixResolver: async ({ accessLevel, targetIdentityId }) => {
           if (accessLevel === 'guest') { // Replaces 'public'
             return 'public/';
           } else if (accessLevel === 'protected') {
             return `protected/${targetIdentityId}/`;
           } else {
             return `private/${targetIdentityId}/`;
           }
         }
       }
     }
   };
   
   Amplify.configure(config, libraryOptions);
   ```

3. **API Configuration Changes**
   - GraphQL API configuration in v6 explicitly identifies the API type:
   ```javascript
   // V5
   API: {
     endpoints: [
       {
         name: 'api1',
         endpoint: 'https://example.com/api'
       }
     ],
     graphql_endpoint: 'https://example.com/graphql'
   }
   
   // V6
   API: {
     REST: {
       api1: {
         endpoint: 'https://example.com/api'
       }
     },
     GraphQL: {
       endpoint: 'https://example.com/graphql',
       region: 'us-east-1',
       defaultAuthMode: 'apiKey'
     }
   }
   ```

### Configuration Override Handling

In v6, calls to `Amplify.configure()` will completely replace any previous configuration, not merge with it. This is especially important to remember when making targeted configuration updates.

```javascript
// INCORRECT approach in v6 (will erase existing config)
Amplify.configure({
  API: {
    GraphQL: {
      endpoint: 'https://new-endpoint.com/graphql'
    }
  }
});

// CORRECT approach in v6
const existingConfig = Amplify.getConfig();
Amplify.configure({
  ...existingConfig,
  API: {
    ...existingConfig.API,
    GraphQL: {
      ...existingConfig.API?.GraphQL,
      endpoint: 'https://new-endpoint.com/graphql'
    }
  }
});
```

### Handling Multiple Configurations

For applications with complex configuration requirements (like multiple environments), v6 provides utility functions to help parse and manipulate configurations:

```javascript
import { parseAmplifyConfig } from 'aws-amplify/utils';

// Parse a configuration file
const parsedConfig = parseAmplifyConfig(configJSON);

// Apply with custom overrides
Amplify.configure(parsedConfig);
```

Always double-check category-specific configuration documentation for each Amplify category you're using, as there may be additional structure changes not covered in this general overview.

## Category-Specific Migration Steps

### Auth

Auth has significant changes in v6, moving to a functional approach with named parameters.

#### Importing Auth

```javascript
// V5
import { Auth } from 'aws-amplify';

// V6
import { signIn, signUp, confirmSignUp, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
```

#### SignUp

```javascript
// V5
await Auth.signUp({
  username,
  password,
  attributes: {
    email,
    phone_number
  },
  validationData: {
    someKey: 'someValue'
  }
});

// V6
await signUp({
  username,
  password,
  options: {
    userAttributes: {
      email,
      phone_number
    },
    validationData: {
      someKey: 'someValue'
    }
  }
});
```

#### SignIn

```javascript
// V5
await Auth.signIn(username, password);

// V6
await signIn({
  username,
  password
});
```

#### Current Session

```javascript
// V5
const session = await Auth.currentSession();
const idToken = session.getIdToken().getJwtToken();

// V6
const { tokens } = await fetchAuthSession();
const idToken = tokens.idToken.toString();
```

#### Sign Out

```javascript
// V5
await Auth.signOut();

// V6
await signOut();
```

#### Get Current User

```javascript
// V5
const user = await Auth.currentAuthenticatedUser();

// V6
const user = await getCurrentUser();
```

### API (GraphQL)

GraphQL API has significant changes, introducing a client-based approach.

#### Importing API

```javascript
// V5
import { API, graphqlOperation } from 'aws-amplify';

// V6
import { generateClient } from 'aws-amplify/api';
```

#### Creating the Client

```javascript
// V6
const client = generateClient();
```

#### Queries

```javascript
// V5
const response = await API.graphql(graphqlOperation(listTodos));

// V6
const response = await client.graphql({ query: listTodos });
```

#### Mutations

```javascript
// V5
const response = await API.graphql(
  graphqlOperation(createTodo, { input: todoDetails })
);

// V6
const response = await client.graphql({
  query: createTodo,
  variables: { input: todoDetails }
});
```

#### Subscriptions

```javascript
// V5
const subscription = API.graphql(
  graphqlOperation(onCreateTodo)
).subscribe({
  next: (eventData) => {
    console.log('Todo created:', eventData.value.data.onCreateTodo);
  }
});

// V6
const subscription = client.graphql({
  query: onCreateTodo
}).subscribe({
  next: (eventData) => {
    console.log('Todo created:', eventData.data.onCreateTodo);
  }
});
```

#### Auth Modes

```javascript
// V5
const response = await API.graphql({
  query: listPrivateTodos,
  authMode: 'AMAZON_COGNITO_USER_POOLS'
});

// V6
const response = await client.graphql({
  query: listPrivateTodos,
  authMode: 'userPool'
});
```

### API (REST)

REST API also moves to a functional approach.

#### Importing REST API

```javascript
// V5
import { API } from 'aws-amplify';

// V6
import { get, post, put, del } from 'aws-amplify/api';
```

#### GET Request

```javascript
// V5
const response = await API.get('myapi', '/items');

// V6
const response = await get({
  apiName: 'myapi',
  path: '/items'
});
```

#### POST Request

```javascript
// V5
const response = await API.post('myapi', '/items', {
  body: { name: 'New Item' }
});

// V6
const response = await post({
  apiName: 'myapi',
  path: '/items',
  options: {
    body: { name: 'New Item' }
  }
});
```

#### PUT Request

```javascript
// V5
const response = await API.put('myapi', '/items/1', {
  body: { name: 'Updated Item' }
});

// V6
const response = await put({
  apiName: 'myapi',
  path: '/items/1',
  options: {
    body: { name: 'Updated Item' }
  }
});
```

#### DELETE Request

```javascript
// V5
const response = await API.del('myapi', '/items/1');

// V6
const response = await del({
  apiName: 'myapi',
  path: '/items/1'
});
```

### Storage

Storage has some method name changes and parameter structure updates.

#### Importing Storage

```javascript
// V5
import { Storage } from 'aws-amplify';

// V6
import { uploadData, getUrl, downloadData, list, remove, copy } from 'aws-amplify/storage';
```

#### Upload Files

```javascript
// V5
await Storage.put('filename.txt', fileData, {
  contentType: 'text/plain',
  progressCallback: (progress) => {
    console.log(`Uploaded: ${progress.loaded}/${progress.total}`);
  }
});

// V6
await uploadData({
  key: 'filename.txt',
  data: fileData,
  options: {
    contentType: 'text/plain',
    onProgress: ({ transferredBytes, totalBytes }) => {
      console.log(`Uploaded: ${transferredBytes}/${totalBytes}`);
    }
  }
});
```

#### Get File URL

```javascript
// V5
const url = await Storage.get('filename.txt');

// V6
const { url } = await getUrl({
  key: 'filename.txt'
});
```

#### Download File

```javascript
// V5
const result = await Storage.get('filename.txt', { download: true });

// V6
const result = await downloadData({
  key: 'filename.txt'
});
```

#### List Files

```javascript
// V5
const result = await Storage.list('folder/');

// V6
const result = await list({
  path: 'folder/'
});
```

#### Delete Files

```javascript
// V5
await Storage.remove('filename.txt');

// V6
await remove({
  key: 'filename.txt'
});
```

### Analytics

Analytics now uses a provider-specific import path.

#### Importing Analytics

```javascript
// V5
import { Analytics } from 'aws-amplify';

// V6 (for Pinpoint)
import { record } from 'aws-amplify/analytics';
```

#### Recording Events

```javascript
// V5
Analytics.record({
  name: 'userSignIn',
  attributes: { method: 'email' }
});

// V6
record({
  name: 'userSignIn',
  attributes: { method: 'email' }
});
```

<!-- PubSub and Interactions sections removed as they're not needed for this application -->

### Additional Categories

Your application may use additional Amplify categories beyond Auth, API, Storage, and Analytics. For any other categories, follow the same migration pattern:

1. Check the official AWS Amplify v6 migration documentation for that specific category
2. Update imports to use the direct path imports
3. Convert methods to use the functional API approach with named parameters
4. Test thoroughly to ensure functionality is maintained

For example, if you were using In-App Messaging, you would update your code like this:

```javascript
// V5
import { InAppMessaging } from 'aws-amplify';
await InAppMessaging.syncMessages();

// V6
import { syncMessages } from 'aws-amplify/in-app-messaging';
await syncMessages();
```

## Utility Migration

Amplify utilities like Hub have been moved to a specific path.

#### Importing Utilities

```javascript
// V5
import { Hub, Logger } from 'aws-amplify';

// V6
import { Hub } from 'aws-amplify/utils';
```

## Hub Events Migration

V6 has reduced Hub events to minimize redundancies. Your event listeners may need to be updated.

```javascript
// V5
Hub.listen('auth', (data) => {
  switch (data.payload.event) {
    case 'signIn':
      console.log('User signed in');
      break;
    case 'signOut':
      console.log('User signed out');
      break;
  }
});

// V6
Hub.listen('auth', (data) => {
  switch (data.payload.event) {
    case 'signInWithRedirect_failure':
    case 'signInWithRedirect_success':
    case 'signIn':
    case 'signOut':
      console.log(`Auth event: ${data.payload.event}`);
      break;
  }
});
```

## Special Instructions for Agentic AI Assistants

These instructions are specifically designed for autonomous AI coding assistants like Claude Code or similar tools. They will help ensure a methodical and thorough approach to this migration.

### Systematic Approach for AI Agents

1. **Preparation Phase**
   - Begin by scanning the entire codebase to identify all AWS Amplify v5 imports and usage patterns
   - Create an inventory of all components that need migration, categorized by Amplify feature (Auth, API, Storage, etc.)
   - Prioritize the migration order: first core configuration files, then Auth components, followed by API (GraphQL/REST), Storage, and other features

2. **Migration Execution Strategy**
   - Work on one category at a time, completely finishing a category before moving to the next
   - For each file requiring changes:
     - First update imports to v6 pattern
     - Then transform method calls to use the new functional approach with named parameters
     - Finally, test the file (if testing functionality is available)
   - Maintain a log of all changes made and any issues encountered

3. **Avoiding Common Pitfalls**
   - Do not get distracted by fixing unrelated code issues - focus solely on the v5 to v6 migration
   - When transforming API calls, ensure parameter structures are correctly nested as per v6 requirements
   - Pay extra attention to async/await patterns, as v6 functional API calls must all be properly awaited
   - Never implement compatibility layers or shims, even temporarily
   - Don't skip complex transformations - ask for clarification if needed but don't leave partial migrations

4. **Verification Approach**
   - After completing each category, perform a validation check to ensure all v5 patterns have been converted
   - When testing components, verify both successful paths and error handling
   - Double-check that all Auth session management and token retrieval is properly updated

Remember that the goal is a complete, clean migration to v6 without any remaining v5 code patterns or shortcuts. Thoroughness is more important than speed.

## Common Troubleshooting Issues

During migration, you might encounter some common issues that require special attention. Here are the most frequent problems and their solutions:

### Authentication Issues

1. **Session Management Problems**
   - **Issue**: After migration, users are unexpectedly logged out or authentication state is lost
   - **Solution**: This often occurs because v6 handles tokens differently. Ensure you've fully migrated from `Auth.currentSession()` to `fetchAuthSession()` and verify that you're properly extracting tokens from the session object
   ```javascript
   // V5
   const session = await Auth.currentSession();
   const idToken = session.getIdToken().getJwtToken();
   
   // V6
   const { tokens } = await fetchAuthSession();
   const idToken = tokens.idToken.toString();
   ```

2. **Sign-In Flow Disruptions**
   - **Issue**: Custom sign-in flows break after migration
   - **Solution**: In v6, sign-in challenge handling has changed significantly. The `confirmSignIn` API now returns an object with `nextStep` instead of a `CognitoUser` with `challengeName` and `challengeParam`. Review all sign-in flows, especially MFA and custom challenges

3. **Missing User Objects**
   - **Issue**: Code that expected user objects from auth operations fails
   - **Solution**: In v6, sign-up and other auth operations no longer return CognitoUser objects. Instead, use the `getCurrentUser()` function to retrieve user information

### API and GraphQL Issues

1. **GraphQL Client Generation Failures**
   - **Issue**: Calls to GraphQL APIs fail after migration
   - **Solution**: Ensure you're properly using the client-based approach with `generateClient()` and correctly structuring your variables
   ```javascript
   // This is correct in v6
   const client = generateClient();
   const response = await client.graphql({
     query: listTodos,
     variables: { filter: { status: { eq: 'active' } } }
   });
   ```

2. **API Response Format Changes**
   - **Issue**: Code breaks when trying to access response data
   - **Solution**: v6 returns a standardized response object for all API calls. Update your code to access data properly from this new structure

3. **API Authorization Failures**
   - **Issue**: API calls that worked in v5 are unauthorized in v6
   - **Solution**: Auth modes are specified differently in v6 using string literals instead of enums
   ```javascript
   // V5
   const response = await API.graphql({
     query: listPrivateTodos,
     authMode: 'AMAZON_COGNITO_USER_POOLS'
   });
   
   // V6
   const response = await client.graphql({
     query: listPrivateTodos,
     authMode: 'userPool'
   });
   ```

### Storage Issues

1. **Progress Tracking Failures**
   - **Issue**: Upload/download progress tracking no longer works
   - **Solution**: Replace `progressCallback` with `onProgress` and update property access
   ```javascript
   // V5
   progressCallback: (progress) => {
     console.log(`Uploaded: ${progress.loaded}/${progress.total}`);
   }
   
   // V6
   onProgress: ({ transferredBytes, totalBytes }) => {
     console.log(`Uploaded: ${transferredBytes}/${totalBytes}`);
   }
   ```

2. **Method Name Changes**
   - **Issue**: Code using Storage methods fails
   - **Solution**: Update method names; particularly `put` became `uploadData`, `get` with download became `downloadData`, and `get` for URLs became `getUrl`

### Hub Events Issues

1. **Missing Events**
   - **Issue**: Code listening for specific Hub events no longer receives them
   - **Solution**: In v6, certain events were removed or consolidated. Storage, In-App Messaging, and Push Notifications categories no longer emit Hub events at all. Update your code to use API responses instead

2. **Event Structure Changes**
   - **Issue**: Code processing Hub events breaks due to different event structures
   - **Solution**: Review and update your event handlers to match the new event structure

### Configuration Issues

1. **Configuration Override Errors**
   - **Issue**: Custom configurations no longer apply correctly
   - **Solution**: In v6, calls to `configure()` fully override previous configurations. When adding custom configurations, use `Amplify.getConfig()` to retain existing settings

2. **Missing Functionality**
   - **Issue**: Features like clock drift handling seem missing
   - **Solution**: Many internal features like clock drift handling are now built-in and don't need explicit configuration

For any persistent issues, consult the official [AWS Amplify Troubleshooting Documentation](https://docs.amplify.aws/javascript/build-a-backend/troubleshooting/) or reach out for assistance.

## Final Checklist

Before deploying your migrated application:

1. ✅ All Amplify imports are updated to the v6 pattern
2. ✅ All API calls use named parameters instead of positional parameters
3. ✅ Auth flows are completely tested (sign up, sign in, session management)
4. ✅ GraphQL operations use the client-based approach
5. ✅ Storage operations use the new method names and parameter structure
6. ✅ Analytics events are being recorded correctly
7. ✅ PubSub subscriptions are working if applicable
8. ✅ React components that use Amplify are updated to the v6 patterns
9. ✅ Error handling is updated for the new API responses
10. ✅ All Hub event listeners are updated to the v6 event names

By following this guide, you should have successfully migrated your AWS Amplify application from v5 to v6 with a clean implementation that doesn't rely on compatibility layers or shims.