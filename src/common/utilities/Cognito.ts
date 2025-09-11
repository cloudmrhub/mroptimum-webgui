interface CognitoTokenConfig {
  domain: string;
  region: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
}

interface RefreshTokenResult {
  success: true;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  idToken?: string;
  refreshToken: string;
}

interface RefreshTokenError {
  success: false;
  error: string;
}

type RefreshTokenResponse = RefreshTokenResult | RefreshTokenError;

export async function refreshCognitoToken(config: CognitoTokenConfig): Promise<RefreshTokenResponse> {
  const {
    domain,
    region,
    clientId,
    clientSecret,
    refreshToken
  } = config;

  // Create the authorization header with base64 encoded client credentials
  const credentials: string = btoa(`${clientId}:${clientSecret}`);
  
  // Prepare the request body
  const requestBody = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken
  });

  const url: string = `https://${domain}.auth.${region}.amazoncognito.com/oauth2/token`;

  try {
    const response: Response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: requestBody.toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const tokenData: TokenResponse = await response.json();
    
    return {
      success: true,
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      idToken: tokenData.id_token,
      refreshToken: tokenData.refresh_token || refreshToken
    };

  } catch (error) {
    console.error('Token refresh failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
