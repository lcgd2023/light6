# WeChat Clone

A web-based chat application that mimics WeChat's functionality, built with Java and Cloudflare.

## Features

- User registration and login with email verification
- Real-time chat messaging
- Friend list management
- Modern, responsive UI similar to WeChat
- Secure password storage
- Email verification using Resend

## Prerequisites

- Java 11 or higher
- Maven
- Cloudflare account
- Resend API key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd wechat-clone
```

2. Configure your environment variables:
- Create a `.env` file in the project root
- Add your Resend API key:
```
RESEND_API_KEY=your_api_key_here
```

3. Build the project:
```bash
mvn clean package
```

4. Run the application:
```bash
java -jar target/wechat-clone-1.0-SNAPSHOT.jar
```

The application will start on port 8080.

## Cloudflare Setup

1. Create a new Cloudflare Pages project
2. Connect your GitHub repository
3. Configure the build settings:
   - Build command: `mvn clean package`
   - Output directory: `target`
   - Environment variables: Add your RESEND_API_KEY

4. Create a D1 database in your Cloudflare account
5. Configure the database connection in the application

## Usage

1. Open your browser and navigate to `http://localhost:8080`
2. Register a new account using your email
3. Verify your email using the code sent to your inbox
4. Log in to start chatting
5. Add friends using their email addresses
6. Start chatting with your friends

## Security Features

- Email verification for new accounts
- Password hashing
- JWT-based authentication
- HTTPS support
- CORS protection

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 