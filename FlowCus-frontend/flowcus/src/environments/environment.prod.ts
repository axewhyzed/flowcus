const apiUrl = '${API_URL}';  // CI/CD replaces this

// Validate that substitution actually happened
if (apiUrl.includes('${')) {
    throw new Error('API_URL was not substituted by CI/CD pipeline. Check your build configuration.');
}

export const environment = {
    production: true,
    apiUrl: apiUrl,
    appName: 'FlowCus'
};