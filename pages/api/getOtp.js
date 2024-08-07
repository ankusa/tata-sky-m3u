// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default function handler(req, res) {
    let requestOptions = {
        method: 'GET',
    };

    return new Promise((resolve, reject) => {
        fetch("https://kong-tatasky.videoready.tv/rest-api/pub/api/v1/rmn/" + req.query.rmn + "/otp", requestOptions)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(result => {
                const data = JSON.parse(result);
                console.log('OTP API response:', data);
                res.status(200).json(data);
                resolve();
            })
            .catch(error => {
                console.error('Error fetching OTP:', error);
                res.status(500).json({ message: 'Internal Server Error', error: error.toString() });
                reject();
            });
    });
}