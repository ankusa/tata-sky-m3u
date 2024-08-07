import Head from 'next/head'
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
    if (tok !== undefined && userd !== undefined) {
      setToken(tok);
      setUser(JSON.parse(userd));
    }
  }, []);

  useEffect(() => {
    if (theUser !== null) {
      const longUrl = window.location.origin + '/api/getM3u?sid=' + theUser.sid + '_' + theUser.acStatus[0] + '&id=' + theUser.id + '&sname=' + theUser.sName + '&tkn=' + token + '&ent=' + theUser.entitlements.map(x => x.pkgId).join('_');

      if (theUser.acStatus === "DEACTIVATED") {
        setDynamicUrl(longUrl);
      } else {
        fetch("/api/shortenUrl", { method: 'POST', body: JSON.stringify({ longUrl }) })
          .then(response => response.json())
          .then(result => {
            console.log(result);
            setDynamicUrl(result.data);
          })
          .catch(error => console.log('error', error));
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
  };

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
                            <input type='password' value={pwd} placeholder='Password' onChange={(e) => setPwd(e.currentTarget.value)} />
                          </Form.Field>
                          <Button primary onClick={authenticateUser}>Login</Button>
                        </>
                    }
                  </Form>
                </Segment>
              </Grid.Column>
              <Grid.Column></Grid.Column>
            </Grid.Row> :
            <Grid.Row>
              <Grid.Column></Grid.Column>
              <Grid.Column computer={8} tablet={12} mobile={16}>
                <Segment loading={loading}>
                  <Header as="h1">Welcome, {theUser.sName}</Header>
                  {
                    theUser.acStatus !== "DEACTIVATED" ?
                      dynamicUrl !== "" ?
                        <Message>
                          <Message.Header>Dynamic URL to get m3u: </Message.Header>
                          <p>
                            <a href={dynamicUrl}>{dynamicUrl}</a>
                          </p>
                          <p>
                               You can use the above m3u URL in OTT Navigator or Tivimate and it will always fetch the latest channel details and links.
                             </p>
                             <p>
                               <Button primary loading={downloading} onClick={() => downloadM3uFile('tata_play.m3u')}>Download m3u</Button>
                             </p>
                           </Message>
                           :
                           <Message error>
                             <Message.Header>Error generating URL</Message.Header>
                             <p>There was an issue generating the URL. Please try again.</p>
                           </Message>
                         :
                         <Message error>
                           <Message.Header>Account Deactivated</Message.Header>
                           <p>Your account is deactivated. Please contact Tata Play customer support for assistance.</p>
                         </Message>
                     }
                     <Button onClick={logout}>Logout</Button>
                   </Segment>
                 </Grid.Column>
                 <Grid.Column></Grid.Column>
               </Grid.Row>
           }
         </Grid>
       </div>
     );
   }