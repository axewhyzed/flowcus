export const environment = {
    production: true,
    // FIX: API_URL is substituted by CI/CD pipeline (azure-pipelines-frontend.yml)
    apiUrl: '${API_URL}'.includes('${') ? '/api' : '${API_URL}',
    appName: 'FlowCus'
}