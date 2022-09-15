export default {
  DRY_RUN: process.env.DRY_RUN === 'true',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  GITHUB_APP_ID: process.env.GITHUB_APP_ID || '',
  GITHUB_APP_INSTALLATION_ID: process.env.GITHUB_APP_INSTALLATION_ID || '',
  GITHUB_APP_PEM_FILE: process.env.GITHUB_APP_PEM_FILE || ''
}
