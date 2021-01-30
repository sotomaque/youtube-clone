import React from 'react';
import { NavLink } from 'react-router-dom';

import Wrapper from '../styles/MobileNavbar';
import {
  HistoryIcon,
  HomeIcon,
  SubIcon,
  TrendingIcon,
  WatchIcon,
} from './Icons';

function MobileNavbar() {
  return (
    <Wrapper>
      <div className="icons">
        {/* Home */}
        <NavLink exact to="/" activeClassName="active">
          <HomeIcon />
        </NavLink>
        {/* Trending */}
        <NavLink to="/feed/trending" activeClassName="active">
          <TrendingIcon />
        </NavLink>
        {/* Subscriptions */}
        <NavLink to="/feed/subscriptions" activeClassName="active">
          <SubIcon />
        </NavLink>
        {/* History */}
        <NavLink to="/feed/history" activeClassName="active">
          <HistoryIcon />
        </NavLink>
        {/* Likes */}
        <NavLink to="/feed/liked_videos" activeClassName="active">
          <WatchIcon />
        </NavLink>
      </div>
    </Wrapper>
  );
}

export default MobileNavbar;
