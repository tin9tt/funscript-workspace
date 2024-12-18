const ENV = {
  DLsite: {
    loginEndpoint:
      process.env.NEXT_PUBLIC_DLSITE_LOGIN_ENDPOINT ??
      'https://localhost:8080/login',
  },
}

export default ENV
