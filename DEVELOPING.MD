# Introduction
Rookout's Desktop App (previously known as "Explorook") is an open-source, [Electron](https://electronjs.org/) based desktop app used by Rookout's [web app](https://app.rookout.com) to extend its usability to the user's local filesystem.  
Rookout's Desktop App uses a local http server to expose its API to Rookout's web debugger.  
The API is protected by a self generated token.

# Security
Rookout's Desktop App is only accessible from localhost  
Rookout's Desktop App only allows read-only access and only to folders the user specifies (and their subfolders)  
Folders traversal are forbidden  
Rookout's Desktop App does not send any information about the user's source code to any server

Rookout's Desktop App spawns three processes (one main and two renderers):  
1. [The main process](#The-main-process)
1. [The react web app](#The-react-web-app)
1. [An invisible worker window](#The-invisible-worker-window)

# The main process
Written in ``Typescript``, the main process is used to initialize the windows and communicate with them via electron's built in RPC functionality.  
It helps the windows achieve functionalities they cannot access directly (e.g: desktop notifications, tray icon)

# The react web app
Written in ``ES6``, and uses ``create-react-app``, The react app is the configuration window where the user can add, delete and manage its configured folders and other global settings.
[](/assets/explorook-main-window.gif)

# The invisible worker window
The invisible worker window runs the GraphQL server and manages all operations on repositories (CRUD operations and indexing)  
The reason we open an invisible window (and not use the main process for that) is because the indexing job is cpu intensive and we cannot block the main process, as it blocks renderer processes as well ([reference](https://medium.com/actualbudget/the-horror-of-blocking-electrons-main-process-351bf11a763c))

# Security & Access
Because we listen on http://localhost:44512 (which is the graphql endpoint we spin), every website running on the client's machine has access to our API.  
In order to restrict access for Rookout's web app only - we use [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

# Project initialization
1. run ``yarn`` in ``/src/webapp`` to install webapp dependencies
1. run ``yarn`` in root directory to install electron's dependencies

# Run in development
In development we run the webpack server to serve the react web app. We do this because we get hot reload when we modify the react code.  
To run the webapp server:
1. run ``yarn run start`` in ``/src/webapp`` to run development server
1. run ``yarn start`` in the root directory to run the electron app

# Build for production
see `.circleci/config.yml`