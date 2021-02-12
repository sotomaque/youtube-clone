import React from 'react';
import Button from '../styles/Auth';
import { SignInIcon } from './Icons';
import { GoogleLogin } from 'react-google-login';
import { authenticate } from 'utils/api-client';

function GoogleAuth() {
  return (
    <GoogleLogin
      clientId="517219065137-c1ku53d7nroc3m29miri1oo7elnb25lv.apps.googleusercontent.com"
      cookiePolicy="single_host_origin"
      onSuccess={authenticate}
      render={(renderProps) => (
        <Button
          tabIndex={0}
          disabled={renderProps.disabled}
          onClick={renderProps.onClick}
          type="button"
        >
          <span className="outer">
            <span className="inner">
              <SignInIcon />
            </span>
            sign in
          </span>
        </Button>
      )}
    />
  );
}

export default GoogleAuth;
