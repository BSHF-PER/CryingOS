-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 14, 2026 at 05:31 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `crying_phone`
--

-- --------------------------------------------------------

--
-- Table structure for table `alarms`
--

CREATE TABLE `alarms` (
  `id` int(10) UNSIGNED NOT NULL,
  `phone_id` int(10) UNSIGNED NOT NULL,
  `hour` tinyint(3) UNSIGNED NOT NULL,
  `minute` tinyint(3) UNSIGNED NOT NULL,
  `label` varchar(100) NOT NULL DEFAULT 'Alarm',
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `apps_catalog`
--

CREATE TABLE `apps_catalog` (
  `id` int(10) UNSIGNED NOT NULL,
  `slug` varchar(40) NOT NULL,
  `name` varchar(80) NOT NULL,
  `description` text DEFAULT NULL,
  `icon` varchar(16) NOT NULL DEFAULT '?',
  `icon_type` enum('emoji','image') NOT NULL DEFAULT 'emoji',
  `icon_src` varchar(500) DEFAULT '',
  `color` varchar(20) NOT NULL DEFAULT '#64748b',
  `version` varchar(20) NOT NULL DEFAULT '1.0.0',
  `entry` varchar(190) NOT NULL,
  `styles` text DEFAULT NULL,
  `removable` tinyint(1) NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `sort` int(11) NOT NULL DEFAULT 50
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

CREATE TABLE `contacts` (
  `id` int(10) UNSIGNED NOT NULL,
  `phone_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone_number` varchar(11) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `is_blocked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `gallery_images`
--

CREATE TABLE `gallery_images` (
  `id` int(10) UNSIGNED NOT NULL,
  `phone_id` int(10) UNSIGNED NOT NULL,
  `filename` varchar(64) NOT NULL,
  `media_type` enum('image','video') NOT NULL DEFAULT 'image',
  `duration_ms` int(10) UNSIGNED DEFAULT NULL,
  `thumbnail_filename` varchar(64) DEFAULT NULL,
  `title` varchar(150) DEFAULT NULL,
  `width` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `height` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `size` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `is_favorite` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(10) UNSIGNED NOT NULL,
  `sender_id` int(10) UNSIGNED NOT NULL,
  `receiver_id` int(10) UNSIGNED NOT NULL,
  `content` text NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `music_playlists`
--

CREATE TABLE `music_playlists` (
  `id` int(10) UNSIGNED NOT NULL,
  `phone_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `music_playlist_tracks`
--

CREATE TABLE `music_playlist_tracks` (
  `playlist_id` int(10) UNSIGNED NOT NULL,
  `track_id` int(10) UNSIGNED NOT NULL,
  `position` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `music_tracks`
--

CREATE TABLE `music_tracks` (
  `id` int(10) UNSIGNED NOT NULL,
  `phone_id` int(10) UNSIGNED NOT NULL,
  `filename` varchar(64) NOT NULL,
  `title` varchar(200) NOT NULL,
  `artist` varchar(100) NOT NULL DEFAULT '',
  `duration_ms` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `size` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `is_favorite` tinyint(1) NOT NULL DEFAULT 0,
  `cover_filename` varchar(64) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notes`
--

CREATE TABLE `notes` (
  `id` int(10) UNSIGNED NOT NULL,
  `phone_id` int(10) UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL DEFAULT '',
  `content` text NOT NULL,
  `type` enum('text','drawing') NOT NULL DEFAULT 'text',
  `color` varchar(20) NOT NULL DEFAULT '#FFD60A',
  `pinned` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `note_drawings`
--

CREATE TABLE `note_drawings` (
  `id` int(10) UNSIGNED NOT NULL,
  `note_id` int(10) UNSIGNED NOT NULL,
  `filename` varchar(64) NOT NULL,
  `width` smallint(5) UNSIGNED NOT NULL DEFAULT 800,
  `height` smallint(5) UNSIGNED NOT NULL DEFAULT 600,
  `size` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `phone_apps`
--

CREATE TABLE `phone_apps` (
  `phone_id` int(10) UNSIGNED NOT NULL,
  `app_id` int(10) UNSIGNED NOT NULL,
  `installed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `telephones`
--

CREATE TABLE `telephones` (
  `id` int(10) UNSIGNED NOT NULL,
  `uuid` char(16) NOT NULL,
  `name` varchar(64) NOT NULL DEFAULT 'Crying Phone',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_seen` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `password_hash` varchar(255) DEFAULT NULL,
  `lock_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `phone_number` varchar(11) DEFAULT NULL,
  `display_name` varchar(50) DEFAULT NULL,
  `status_message` varchar(100) DEFAULT NULL,
  `wallpaper_type` enum('preset','upload') NOT NULL DEFAULT 'preset',
  `wallpaper_value` varchar(255) NOT NULL DEFAULT 'midnight'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voice_recordings`
--

CREATE TABLE `voice_recordings` (
  `id` int(10) UNSIGNED NOT NULL,
  `phone_id` int(10) UNSIGNED NOT NULL,
  `filename` varchar(64) NOT NULL,
  `title` varchar(100) NOT NULL,
  `duration_ms` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `size` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `alarms`
--
ALTER TABLE `alarms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_phone` (`phone_id`);

--
-- Indexes for table `apps_catalog`
--
ALTER TABLE `apps_catalog`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_contact` (`phone_id`,`phone_number`),
  ADD KEY `idx_phone` (`phone_id`);

--
-- Indexes for table `gallery_images`
--
ALTER TABLE `gallery_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_phone` (`phone_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sender` (`sender_id`),
  ADD KEY `idx_receiver` (`receiver_id`),
  ADD KEY `idx_read` (`read_at`);

--
-- Indexes for table `music_playlists`
--
ALTER TABLE `music_playlists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_phone` (`phone_id`);

--
-- Indexes for table `music_playlist_tracks`
--
ALTER TABLE `music_playlist_tracks`
  ADD PRIMARY KEY (`playlist_id`,`track_id`),
  ADD KEY `fk_mpt_track` (`track_id`);

--
-- Indexes for table `music_tracks`
--
ALTER TABLE `music_tracks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_phone` (`phone_id`);

--
-- Indexes for table `notes`
--
ALTER TABLE `notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_phone` (`phone_id`),
  ADD KEY `idx_updated` (`updated_at`);

--
-- Indexes for table `note_drawings`
--
ALTER TABLE `note_drawings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_note` (`note_id`);

--
-- Indexes for table `phone_apps`
--
ALTER TABLE `phone_apps`
  ADD PRIMARY KEY (`phone_id`,`app_id`),
  ADD KEY `fk_pa_app` (`app_id`);

--
-- Indexes for table `telephones`
--
ALTER TABLE `telephones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_uuid` (`uuid`),
  ADD UNIQUE KEY `phone_number` (`phone_number`);

--
-- Indexes for table `voice_recordings`
--
ALTER TABLE `voice_recordings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_phone` (`phone_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `alarms`
--
ALTER TABLE `alarms`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `apps_catalog`
--
ALTER TABLE `apps_catalog`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gallery_images`
--
ALTER TABLE `gallery_images`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `music_playlists`
--
ALTER TABLE `music_playlists`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `music_tracks`
--
ALTER TABLE `music_tracks`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notes`
--
ALTER TABLE `notes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `note_drawings`
--
ALTER TABLE `note_drawings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `telephones`
--
ALTER TABLE `telephones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `voice_recordings`
--
ALTER TABLE `voice_recordings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `alarms`
--
ALTER TABLE `alarms`
  ADD CONSTRAINT `fk_alarms_phone` FOREIGN KEY (`phone_id`) REFERENCES `telephones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `contacts`
--
ALTER TABLE `contacts`
  ADD CONSTRAINT `fk_contacts_phone` FOREIGN KEY (`phone_id`) REFERENCES `telephones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `gallery_images`
--
ALTER TABLE `gallery_images`
  ADD CONSTRAINT `fk_gi_phone` FOREIGN KEY (`phone_id`) REFERENCES `telephones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `fk_msg_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `telephones` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `telephones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `music_playlists`
--
ALTER TABLE `music_playlists`
  ADD CONSTRAINT `fk_mp_phone` FOREIGN KEY (`phone_id`) REFERENCES `telephones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `music_playlist_tracks`
--
ALTER TABLE `music_playlist_tracks`
  ADD CONSTRAINT `fk_mpt_playlist` FOREIGN KEY (`playlist_id`) REFERENCES `music_playlists` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_mpt_track` FOREIGN KEY (`track_id`) REFERENCES `music_tracks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `music_tracks`
--
ALTER TABLE `music_tracks`
  ADD CONSTRAINT `fk_mt_phone` FOREIGN KEY (`phone_id`) REFERENCES `telephones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notes`
--
ALTER TABLE `notes`
  ADD CONSTRAINT `fk_notes_phone` FOREIGN KEY (`phone_id`) REFERENCES `telephones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `note_drawings`
--
ALTER TABLE `note_drawings`
  ADD CONSTRAINT `fk_nd_note` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `phone_apps`
--
ALTER TABLE `phone_apps`
  ADD CONSTRAINT `fk_pa_app` FOREIGN KEY (`app_id`) REFERENCES `apps_catalog` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pa_phone` FOREIGN KEY (`phone_id`) REFERENCES `telephones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `voice_recordings`
--
ALTER TABLE `voice_recordings`
  ADD CONSTRAINT `fk_vr_phone` FOREIGN KEY (`phone_id`) REFERENCES `telephones` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
