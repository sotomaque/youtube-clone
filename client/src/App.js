import React from 'react';
import { Switch, Route } from 'react-router-dom';

import Navbar from 'components/Navbar';
import Sidebar from 'components/Sidebar';
import MobileNavbar from 'components/MobileNavbar';
import Container from 'styles/Container';

import Home from 'pages/Home';
import WatchVideo from 'pages/WatchVideo';
import Channel from 'pages/Channel';
import SearchResults from 'pages/SearchResults';
import Subscriptions from 'components/Subscriptions';
import Trending from 'pages/Trending';
import History from 'pages/History';
import Library from 'pages/Library';
import YourVideos from 'pages/YourVideos';
import LikedVideos from 'pages/LikedVideos';
import NotFound from 'pages/NotFound';

import { useLocationChange } from 'hooks/use-location-change';

function App() {
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);
  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  // on location change -> close sidebar
  const handleCloseSidebar = () => setSidebarOpen(false);
  useLocationChange(handleCloseSidebar);

  return (
    <>
      <Navbar toggleSidebar={toggleSidebar} />
      <Sidebar isSidebarOpen={isSidebarOpen} />
      <MobileNavbar />
      <Container>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/watch/:videoId" component={WatchVideo} />
          <Route path="/channel/:channelId" component={Channel} />
          <Route path="/results/:searchQuery" component={SearchResults} />
          <Route path="/feed/trending" component={Trending} />
          <Route path="/feed/subscriptions" component={Subscriptions} />
          <Route path="/feed/library" component={Library} />
          <Route path="/feed/history" component={History} />
          <Route path="/feed/my_videos" component={YourVideos} />
          <Route path="/feed/liked_videos" component={LikedVideos} />
          <Route path="*" component={NotFound} />
        </Switch>
      </Container>
    </>
  );
}

export default App;
