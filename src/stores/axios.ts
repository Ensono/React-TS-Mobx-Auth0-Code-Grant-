import axios from 'axios'

// tslint:disable
axios.interceptors &&
    (function() {
        // Add a request interceptor
        axios.interceptors.request.use(
            function(config) {
                // Do something before request is sent
                return config
            },
            function(error) {
                // Do something with request error
                return Promise.reject(error)
            }
        )

        // Add a response interceptor
        axios.interceptors.response.use(
            function(response) {
                // Do something with response data
                return response
            },
            function(error) {
                console.debug('Handling error response')
                if (error.response && error.response.status === 403) {
                    console.debug('handling 403')
                }
                return Promise.reject(error)
            }
        )
    })()

export default axios
