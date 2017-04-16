## Setup

1. `npm install`
1. Make a file called `.env` like
    ```
    CLARITY_USERNAME="username"
    CLARITY_PASSWORD="password"
    ```
1. `node run.js | mail --subject "Clarity weekly summary" --append "Content-type:text/html" --append "From:from_address@domain.com" to_address@domain.com

## To-do

* Specify date range and intelligently segment that into 5-day chunks, instead of hard-coding the last week
