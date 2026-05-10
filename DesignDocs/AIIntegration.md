# AI Integration

I want treetop users to be able to give treetop an API keys for one or more providers, then get access
to these capabilities:

## App AI integration

Apps should be able to call controller APIs (through a docker internal network). Part of these APIs should be access
to an AI agent. The controller just returns the agent response, and it's up to the app to interpret it in whatever
way it wants.
- The controller handles permissions, limits, cost tracking, etc
- Should be some helper APIs for reading+writing files, and other standard stuff

## App development integration

You should be able to develop + remix apps using AI. There should be APIs available through the controller to be able
to read+write files of a given container.
- The app container should run its app using `npm run dev`, then auto-reload should handle the rest, so that the user doesn't need to restart the container.