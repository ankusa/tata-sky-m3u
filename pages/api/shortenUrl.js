export default async function handler(req, res) {
  console.log('inside handler');
  const body = JSON.parse(req.body);
  const { longUrl } = body;

  res.status(200).json({ data: longUrl });
}