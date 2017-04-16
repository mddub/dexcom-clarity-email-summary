## Setup

1. `npm install`

1. Sign up for a free Cloudinary account (hosting for images in email body)

1. Make a file called `.env` like
    ```
    NIGHTSCOUT_HOST="https://your.nightscout.host"

    # Find this URL under "Environment variable" in the "Account Details" section of the "Dashboard" page
    CLOUDINARY_URL="cloudinary://<api_key>:<api_secret>@<cloud_name>"
    ```

1. `node run.js | mail --subject "Nightscout weekly summary" --append "Content-type:text/html" --append "From:from_address@domain.com" to_address@domain.com`
