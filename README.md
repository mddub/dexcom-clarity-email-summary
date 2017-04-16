## Setup

1. `npm install`

1. Sign up for a free Cloudinary account (hosting for images in email body)

1. Make a file called `.env` like
    ```
    CLARITY_USERNAME="username"
    CLARITY_PASSWORD="password"
    # Find this URL under "Environment variable" in the "Account Details" section of the "Dashboard" page
    CLOUDINARY_URL="cloudinary://<api_key>:<api_secret>@<cloud_name>"
    ```

1. `node run.js | mail --subject "Clarity weekly summary" --append "Content-type:text/html" --append "From:from_address@domain.com" to_address@domain.com`

## To-do

* Specify date range and intelligently segment that into 5-day chunks, instead of hard-coding the last week
