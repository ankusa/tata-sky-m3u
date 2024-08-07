import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

import { Button, Form, Grid, Header, Message, Radio, Segment } from 'semantic-ui-react';
import { useEffect, useState } from 'react';

export default function Home() {
  // Component logic...

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
    if (tok !== undefined && userd !== undefined) {
      setToken(tok);
      setUser(JSON.parse(userd));
    }
  }, []);

  useEffect(() => {
    if (theUser !== null) {
      if (theUser.acStatus !== "DEACTIVATED") {
        if (window.location.origin.indexOf('localhost') === -1) {
          fetch("/api/shortenUrl", { method: 'POST', body: JSON.stringify({ longUrl: window.location.origin + '/api/getM3u?sid=' + theUser.sid + '_' + theUser.acStatus[0] + '&id=' + theUser.id + '&sname=' + theUser.sName + '&tkn=' + token + '&ent=' + theUser.entitlements.map(x => x.pkgId).join('_') }) })
            .then(response => response.json())
            .then(result => {
              console.log(result);
              const mydiv = document.createElement('div');
              mydiv.innerHTML = result.data;
              setDynamicUrl(mydiv.querySelector('#shortenurl').value);
            })
            .catch(error => console.log('error', error));
        } else {
          setDynamicUrl('');
        }
      } else {
        console.log(window.location.origin.replace('localhost', '127.0.0.1') + '/api/getM3u?sid=' + theUser.sid + '_' + theUser.acStatus[0] + '&id=' + theUser.id + '&sname=' + theUser.sName + '&tkn=' + token + '&ent=' + theUser.entitlements.map(x => x.pkgId).join('_'));
      }
    } else {
      setDynamicUrl("");
    }
  }, [theUser, token]);

  const getOTP = () => {
    setLoading(true);
    fetch("/api/getOtp?rmn=" + rmn)
      .then(response => response.text())
      .then(result => {
        const res = JSON.parse(result);
        setLoading(false);
        console.log(res);
        if (res.message.toLowerCase().indexOf("otp") > -1 && res.message.toLowerCase().indexOf("successfully") > -1) {
          setOtpSent(true);
          setError("");
        } else {
          setError(res.message);
        }
      })
      .catch(error => {
        console.log('error', error);
        setError(error.toString());
      });
  }

  const authenticateUser = () => {
    setLoading(true);
    fetch("/api/getAuthToken?sid=" + sid + "&loginType=" + loginType + "&otp=" + otp + "&pwd=" + pwd + "&rmn=" + rmn)
      .then(response => response.text())
      .then(result => {
        const res = JSON.parse(result);
        console.log(res);
        if (res.code === 0) {
          let userDetails = res.data.userDetails;
          userDetails.id = res.data.userProfile.id;
          let token = res.data.accessToken;
          setUser(userDetails);
          setToken(token);
          localStorage.setItem("userDetails", JSON.stringify(userDetails));
          localStorage.setItem("token", token);
          setError("");
        } else {
          setError(res.message);
        }
        setLoading(false);
      })
      .catch(error => {
        console.log('error', error);
        setError(error.toString());
        setLoading(false);
      });
  }

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
  }

  function downloadM3uFile(filename) {
    setDownloading(true);
    const requestOptions = {
      method: 'GET',
      redirect: 'follow'
    };

    fetch(window.location.origin + '/api/getM3u?sid=' + theUser.sid + '_' + theUser.acStatus[0] + '&id=' + theUser.id + '&sname=' + theUser.sName + '&tkn=' + token + '&ent=' + theUser.entitlements.map(x => x.pkgId).join('_'), requestOptions)
      .then(response => response.text())
      .then(result => {
        console.log(result);
        const data = result;
        const blob = new Blob([data], { type: 'text/plain' });
        if (window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveBlob(blob, filename);
        } else {
          const elem = window.document.createElement('a');
          elem.href = window.URL.createObjectURL(blob);
          elem.download = filename;
          document.body.appendChild(elem);
          elem.click();
          document.body.removeChild(elem);
        }
        setDownloading(false);
      })
      .catch(error => {
        console.log('error', error);
        setDownloading(false);
      });
  }

  return (
    <div>
      <Head>
        <title>Generate Tata Play IPTV playlist</title>
        <meta
          name="description"
          content="Easiest way to generate a Tata Play IPTV (m3u) playlist for the channels you have subscribed to."
        />
      </Head>
      <Grid columns='equal' padded centered>
        {token === "" || theUser === null ? (
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

                  {loginType === 'OTP' ? (
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
                      {otpSent ? (
                        <Button primary onClick={authenticateUser}>Login</Button>
                      ) : (
                        <Button primary onClick={getOTP}>Get OTP</Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Form.Field>
                        <label>Subscriber ID</label>
                        <input value={sid} placeholder='Subscriber ID' onChange={(e) => setSid(e.currentTarget.value)} />
                      </Form.Field>
                      <Form.Field>
                        <label>Password</label>
                        <input type='password' value={pwd} placeholder='Password' onChange={(e) => setPwd(e.currentTarget.value)} />
                      </Form.Field>
                      <Button primary onClick={authenticateUser}>Login</Button>
                    </>
                  )}
                </Form>
              </Segment>
            </Grid.Column>
<Grid.Column></Grid.Column>
          </Grid.Row>
        ) : (
          <Grid.Row>
            <Grid.Column></Grid.Column>
            <Grid.Column computer={8} tablet={12} mobile={16}>
              <Segment loading={loading}>
                <Header as={'h1'}>Generate Tata Play IPTV (m3u) playlist</Header>
                <Button primary loading={downloading} onClick={() => downloadM3uFile('playlist.m3u')}>Download M3U Playlist</Button>
                <Button secondary onClick={logout}>Logout</Button>
                {err && <Message error>{err}</Message>}
                {dynamicUrl && (
                  <div>
                    <Header as={'h2'}>Your M3U Playlist URL</Header>
                    <a href={dynamicUrl} target="_blank" rel="noopener noreferrer">{dynamicUrl}</a>
                  </div>
                )}
              </Segment>
            </Grid.Column>
            <Grid.Column></Grid.Column>
          </Grid.Row>
        )}
      </Grid>
    </div>
  );
}