# SkillIO Backend

This project contains the backend server for SkillIO. Follow the steps below to set up and run the server.

## Prerequisites

- Python 3.12
- `uv` package manager
- `requirements.txt` file for dependencies
- `.env` file (refer to the example `.env` file provided)

## Setup Instructions

1. **Clone the Repository**  
    ```bash
    git clone https://github.com/otsosaarinen/since-ai-skillio.git
    cd backend
    ```

2. **Install Dependencies**  
    Use the `uv` package manager to install the required dependencies:  
    ```bash
    uv install -r requirements.txt
    ```

3. **Set Up Environment Variables**  
    Create a `.env` file in the root directory of the project. Use the `.env.example` file as a reference for the required environment variables.

4. **Run the Server**  
    Start the server using the following command:  
    ```bash
    uvicorn server:app --reload --port 4000
    ```


## Notes

- Ensure you are using Python 3.12 to avoid compatibility issues.
- The `uv` package manager simplifies dependency management and ensures all packages are installed correctly.

