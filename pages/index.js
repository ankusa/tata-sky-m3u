import Head from 'next/head';
import { Button, Form, Grid, Header, Message, Radio, Segment } from 'semantic-ui-react';
import { useEffect, useState } from 'react';

export default function Home() {
  const [rmn, setRmn] = useState("");
  const [sid, setSid] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [theUser, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setError] = useState("");
  const [dynamicUrl, setDynamicUrl] = useState("");
  const [loginType, setLoginType] = useState("OTP");
  const [pwd, setPwd] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let tok = localStorage.getItem("token");
    let userd = localStorage.getItem("userDetails");
    if (tok && userd) {
      setToken(tok);
      setUser(JSON.parse(userd));
    }
  }, []);

  useEffect(() => {
    if (theUser && theUser.acStatus !== "DEACTIVATED") {
      const longUrl = `${window.location.origin}/api/getM3u?sid=${theUser.sid}_${theUser.acStatus[0]}&id=${theUser.id}&sname=${theUser.sName}&tkn=${token}&ent=${theUser.entitlements.map(x => x.pkgId).join('_')}`;
      setDynamicUrl(longUrl);
    } else {
      setDynamicUrl("");
    }
  }, [theUser, token]);

  const getOTP = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/getOtp?rmn=" + rmn);
      const result = await response.json();

      console.log("getOtp response:", result);

      if (result.message.toLowerCase().includes("otp") && result.message.toLowerCase().includes("successfully")) {
        setOtpSent(true);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.log("Error in getOTP:", error);
      setError("Failed to send OTP. Please try again.");
    }

    setLoading(false);
  };

  const authenticateUser = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/getAuthToken?sid=${sid}&loginType=${loginType}&otp=${otp}&pwd=${pwd}&rmn=${rmn}`);
      const result = await response.json();

      if (result.code === 0) {
        const userDetails = { ...result.data.userDetails, id: result.data.userProfile.id };
        const token = result.data.accessToken;
        setUser(userDetails);
        setToken(token);
        localStorage.setItem("userDetails", JSON.stringify(userDetails));
        localStorage.setItem("token", token);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.log("Error in authenticateUser:", error);
      setError("Authentication failed. Please try again.");
    }

    setLoading(false);
  };

  const logout = () => {
    localStorage.clear();
    setRmn("");
    setSid("");
    setOtpSent(false);
    setOtp("");
    setPwd("");
    setUser(null);
    setToken("");
    setLoading(false);
  };

  const downloadM3uFile = async (filename) => {
    setDownloading(true);

    try {
      const response = await fetch(dynamicUrl);
      const data = await response.text();
      const blob = new Blob([data], { type: 'text/plain' });

      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
      } else {
        const elem = document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
      }
    } catch (error) {
      console.log("Error in downloadM3uFile:", error);
      setError("Failed to download M3U file. Please try again.");
    }

    setDownloading(false);
  };

  return (
    <div>
      <Head>
        <title>Generate Tata Play IPTV playlist</title>
        <meta name="description" content="Easiest way to generate a Tata Play IPTV (m3u) playlist for the channels you have subscribed to." />
      </Head>
      <Grid columns='equal' padded centered>
        {
          token === "" || theUser === null ?
            <Grid.Row>
              <Grid.Column></Grid.Column>
              <Grid.Column computer={8} tablet={12} mobile={16}>
                <Segment loading={loading}>
                  <Header as={'h1'}>Generate Tata Play IPTV (m3u) playlist</Header>
                  <Form>
                    <Form.Group inline>
                      <label>Login via </label>
                      <Form.Field>
                        <Radio
                          label='OTP'
                          name='loginTypeRadio'
                          value='OTP'
                          checked={loginType === 'OTP'}
                          onChange={(e, { value }) => { setLoginType(value); }}
                        />
                      </Form.Field>
                      <Form.Field>
                        <Radio
                          label='Password'
                          name='loginTypeRadio'
                          value='PWD'
                          checked={loginType === 'PWD'}
                          onChange={(e, { value }) => { setLoginType(value); }}
                        />
                      </Form.Field>
                    </Form.Group>
                    {
                      loginType === 'OTP' ?
                        <>
                          <Form.Field disabled={otpSent}>
                            <label>RMN</label>
                            <input value={rmn} placeholder='Registered Mobile Number' onChange={(e) => setRmn(e.currentTarget.value)} />
                          </Form.Field>
                          <Form.Field disabled={otpSent}>
                            <label>Subscriber ID</label>
                            <input value={sid} placeholder='Subscriber ID' onChange={(e) => setSid(e.currentTarget.value)} />
                          </Form.Field>
                          <Form.Field disabled={!otpSent}>
                            <label>OTP</label>
                            <input value={otp} placeholder='OTP' onChange={(e) => setOtp(e.currentTarget.value)} />
                          </Form.Field>
                          {
                            otpSent ? <Button primary onClick={authenticateUser}>Login</Button> :
                              <Button primary onClick={getOTP}>Get OTP</Button>
                          }
                        </>
                        :
                        <>
                          <Form.Field>
                            <label>Subscriber ID</label>
                            <input value={sid} placeholder='Subscriber ID' onChange={(e) => setSid(e.currentTarget.value)} />
                          </Form.Field>
                          <Form.Field>
                            <label>Password</label>
<input type="password" value={pwd} placeholder='Password' onChange={(e) => setPwd(e.currentTarget.value)} />
                          </Form.Field>
                          <Button primary onClick={authenticateUser}>Login</Button>
                        </>
                    }
                  </Form>
                  {err && <Message error header="Error" content={err} />}
                </Segment>
              </Grid.Column>
              <Grid.Column></Grid.Column>
            </Grid.Row>
            :
            <Grid.Row>
              <Grid.Column></Grid.Column>
              <Grid.Column computer={8} tablet={12} mobile={16}>
                <Segment>
                  <Header as='h2'>Welcome, {theUser.sName}</Header>
                  <p>Use the following URL to add your Tata Play channels to your IPTV player:</p>
                  <Message>
                    <pre>{dynamicUrl}</pre>
                  </Message>
                  <Button primary onClick={() => downloadM3uFile('tata-play.m3u')} loading={downloading}>
                    {downloading ? "Downloading..." : "Download M3U File"}
                  </Button>
                  <Button secondary onClick={logout}>Logout</Button>
                </Segment>
              </Grid.Column>
              <Grid.Column></Grid.Column>
            </Grid.Row>
        }
      </Grid>
    </div>
  );
}

// pages/api/getOtp.js
export default async function handler(req, res) {
  const { rmn } = req.query;

  if (!rmn) {
    return res.status(400).json({ message: "Registered Mobile Number (RMN) is required" });
  }

  try {
    // Replace this with your actual API call to send OTP
    const otpResponse = await sendOtpToRmn(rmn); // Replace this line with the actual OTP sending logic

    if (otpResponse.success) {
      res.status(200).json({ message: "OTP sent successfully" });
    } else {
      res.status(500).json({ message: otpResponse.error || "Failed to send OTP" });
    }
  } catch (error) {
    console.error("Error in /api/getOtp:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
}

// Replace this function with the actual logic to send OTP
async function sendOtpToRmn(rmn) {
  // Simulate OTP sending logic
  return { success: true };
}