// @ts-nocheck
import React from 'react';
import { UploadIcon } from './Icons';
import { uploadMedia } from 'utils/upload-media';
import { useSnackbar } from 'react-simple-snackbar';
import path from 'path';
import UploadVideoModal from './UploadVideoModal';

function UploadVideo() {
  const [defaultTitle, setDefaultTitle] = React.useState('');
  const [isModalOpen, setModalOpen] = React.useState(false);
  const [openSnackbar] = useSnackbar();
  const [previewVideo, setPreviewVideo] = React.useState('');
  const [thumbnail, setThumbnail] = React.useState('');
  const [url, setUrl] = React.useState('');

  const closeModal = () => setModalOpen(false);

  /**
   * @param {{ target: { files: any[]; }; }} event
   */
  async function handleUploadVideo(event) {
    event.persist();
    const file = event.target.files[0];
    // get file name
    setDefaultTitle(path.basename(file.name, path.extname(file.name)));

    if (file) {
      const fileSize = file.size / 1000000;
      if (fileSize > 50) {
        // 50 mb
        return openSnackbar('Video file should be less than 50mb');
      }
      setPreviewVideo(URL.createObjectURL(file));
      setModalOpen(true);
      const url = await uploadMedia({
        type: 'video',
        file,
        preset: 'f0eo2m3g',
      });
      setUrl(url);
      // get thumbnail by replacing extName with .jpg
      const extension = path.extname(url);
      setThumbnail(url.replace(extension, '.jpg'));
    }
    event.target.value = '';
  }

  return (
    <div>
      <label htmlFor="video-upload">
        <UploadIcon />
      </label>
      <input
        accept="video/*"
        id="video-upload"
        onChange={handleUploadVideo}
        style={{ display: 'none' }}
        type="file"
      />
      {isModalOpen && (
        <UploadVideoModal
          closeModal={closeModal}
          defaultTitle={defaultTitle}
          previewVideo={previewVideo}
          thumbnail={thumbnail}
          url={url}
        />
      )}
    </div>
  );
}

export default UploadVideo;
