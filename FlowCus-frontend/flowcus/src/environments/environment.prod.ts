export const environment = {
    production: true,
    apiUrl: '${API_URL}',
    appName: 'FlowCus'
};

if (environment.apiUrl.includes('${')) {
    throw new Error('API_URL was not substituted by CI/CD pipeline. Check your build configuration.');
}
