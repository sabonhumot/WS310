-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 28, 2026 at 01:43 AM
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
-- Database: `bill_split`
--

-- --------------------------------------------------------

--
-- Table structure for table `bills`
--

CREATE TABLE `bills` (
  `id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `bill_name` varchar(255) NOT NULL,
  `invite_code` varchar(50) NOT NULL,
  `share_token` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `archived_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bills`
--

INSERT INTO `bills` (`id`, `created_by`, `bill_name`, `invite_code`, `share_token`, `created_at`, `archived_at`) VALUES
(1, 9, 'asdsad', 'I0481B', NULL, '2026-03-13 01:35:35', NULL),
(2, 9, 'asdasd', 'H5BH5P', NULL, '2026-03-13 01:51:52', NULL),
(7, 9, 'Ligo Dagat', 'B1R3CP', NULL, '2026-03-13 02:30:11', NULL),
(8, 10, 'La la lost you', '3Q7JRB', NULL, '2026-03-27 18:17:58', '2026-03-27 22:29:42'),
(9, 10, 'Hozier', 'RH2O49', NULL, '2026-03-27 18:58:54', '2026-03-27 22:29:40'),
(10, 10, 'XG', 'SBSQ5O', NULL, '2026-03-27 22:40:56', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `email_verifications`
--

CREATE TABLE `email_verifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `email_verifications`
--

INSERT INTO `email_verifications` (`id`, `user_id`, `token`, `expires_at`, `verified_at`, `created_at`) VALUES
(1, 8, 'i9zacov1pvhdrtm0jb9qrr', '2026-03-08 11:47:55', '2026-03-07 11:48:15', '2026-03-07 03:47:55'),
(2, 9, 'zxsxi62t536ej88sdooyv', '2026-03-14 09:34:07', '2026-03-13 09:35:00', '2026-03-13 01:34:07'),
(3, 10, 'gzm338ppiek86qeop9qqzw', '2026-03-29 00:05:00', '2026-03-28 00:05:23', '2026-03-27 16:05:00'),
(4, 11, 'uo7jsvn8d82telfidp8f9', '2026-03-29 07:01:25', NULL, '2026-03-27 23:01:25'),
(5, 12, 'crqz7v5l0x813d22o9xyey', '2026-03-29 08:41:02', NULL, '2026-03-28 00:41:02');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `bill_id` int(11) NOT NULL,
  `expense_name` varchar(255) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `paid_by_user_id` int(11) DEFAULT NULL,
  `paid_by_guest_id` int(11) DEFAULT NULL,
  `split_type` enum('equally','custom') DEFAULT 'equally',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `bill_id`, `expense_name`, `total_amount`, `paid_by_user_id`, `paid_by_guest_id`, `split_type`, `created_at`) VALUES
(6, 7, 'Kaon', 1000.00, 9, NULL, 'equally', '2026-03-13 02:30:44'),
(7, 8, 'dinner', 500.00, 10, NULL, 'equally', '2026-03-27 18:35:35'),
(8, 8, 'sunflower', 200.00, 10, NULL, 'equally', '2026-03-27 18:57:39'),
(9, 8, 'Amen', 100.00, 9, NULL, 'equally', '2026-03-27 19:01:15'),
(12, 10, 'Loco', 100.00, 10, NULL, 'equally', '2026-03-27 22:47:27');

-- --------------------------------------------------------

--
-- Table structure for table `expense_splits`
--

CREATE TABLE `expense_splits` (
  `id` int(11) NOT NULL,
  `expense_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `guest_user_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expense_splits`
--

INSERT INTO `expense_splits` (`id`, `expense_id`, `user_id`, `guest_user_id`, `amount`) VALUES
(10, 6, 9, NULL, 500.00),
(11, 6, 8, NULL, 500.00),
(12, 7, 10, NULL, 500.00),
(15, 9, 10, NULL, 50.00),
(16, 9, 9, NULL, 50.00),
(19, 8, 10, NULL, 100.00),
(20, 8, 9, NULL, 100.00),
(23, 12, 10, NULL, 50.00),
(24, 12, 9, NULL, 50.00);

-- --------------------------------------------------------

--
-- Table structure for table `guest_users`
--

CREATE TABLE `guest_users` (
  `id` int(11) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `nickname` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `guest_users`
--

INSERT INTO `guest_users` (`id`, `first_name`, `last_name`, `nickname`, `email`, `phone`, `created_at`) VALUES
(1, 'Sab', 'Carp', '', 'rodeliza.2002+3@gmail.com', NULL, '2026-03-27 23:53:16');

-- --------------------------------------------------------

--
-- Table structure for table `involved_persons`
--

CREATE TABLE `involved_persons` (
  `id` int(11) NOT NULL,
  `bill_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `guest_user_id` int(11) DEFAULT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `involved_persons`
--

INSERT INTO `involved_persons` (`id`, `bill_id`, `user_id`, `guest_user_id`, `added_at`) VALUES
(8, 7, 9, NULL, '2026-03-13 02:30:11'),
(9, 7, 8, NULL, '2026-03-13 02:30:11'),
(10, 8, 10, NULL, '2026-03-27 18:17:58'),
(11, 8, 9, NULL, '2026-03-27 18:56:06'),
(12, 9, 10, NULL, '2026-03-27 18:58:54'),
(13, 9, 9, NULL, '2026-03-27 18:58:54'),
(14, 10, 10, NULL, '2026-03-27 22:40:56'),
(16, 10, 9, NULL, '2026-03-27 22:45:48');

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settlements`
--

CREATE TABLE `settlements` (
  `id` int(11) NOT NULL,
  `bill_id` int(11) NOT NULL,
  `paid_by_user_id` int(11) DEFAULT NULL,
  `paid_by_guest_id` int(11) DEFAULT NULL,
  `paid_to_user_id` int(11) DEFAULT NULL,
  `paid_to_guest_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settlements`
--

INSERT INTO `settlements` (`id`, `bill_id`, `paid_by_user_id`, `paid_by_guest_id`, `paid_to_user_id`, `paid_to_guest_id`, `amount`, `created_at`) VALUES
(1, 9, 9, NULL, 10, NULL, 300.00, '2026-03-27 22:04:47'),
(2, 10, 9, NULL, 10, NULL, 50.00, '2026-03-27 22:48:38');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `nickname` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `user_type_id` int(11) NOT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `viaInvitaiton` tinyint(1) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT 0,
  `verification_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `nickname`, `email`, `username`, `password_hash`, `user_type_id`, `email_verified`, `created_at`, `updated_at`, `viaInvitaiton`, `isActive`, `verification_token`) VALUES
(8, 'Rodeliza', 'La Rosa', 'Rode', 'suraidasudaishii@gmail.com', 'Astrid', '$2b$10$Bjz/jFSzW5UEqxA0Q1Z3NOs3FCF2cpGgwyi3CzagZrueQqkTI6sHm', 1, 1, '2026-03-07 03:47:55', '2026-03-07 03:48:15', NULL, 0, NULL),
(9, 'Arl', 'Joshua', 'wangwang', 'arljoshua9@gmail.com', 'woshuaaaa', '$2b$10$mpwf6dk./WrFFJbf5EOcnOPUx0EqCnQD69c6zbOOHmL21ZS0cKf1m', 1, 1, '2026-03-13 01:34:07', '2026-03-13 02:28:43', NULL, 0, NULL),
(10, 'Rode', 'La Rosa', 'jeongyeon', 'rodeliza.2002@gmail.com', 'astridz', '$2b$10$CM0UzYSDEDsVApH4tWCSse0LFp8fCe3xgARPc8LkhNmDFQioymKIW', 1, 1, '2026-03-27 16:05:00', '2026-03-27 23:19:31', NULL, 0, NULL),
(11, 'Rasheed', 'Paradela', 'shed', 'rodeliza.2002+1@gmail.com', 'snezhy', '$2b$10$EaARlFiOy64Dy5wE60IL1uwMLxTqY4By/ud54s6e4nfbayKiu5Tp2', 1, 1, '2026-03-27 23:01:25', '2026-03-27 23:02:48', NULL, 0, NULL),
(12, 'Test', 'User', 'tester', 'test@example.com', 'testuser', '$2b$10$qmwFxYfAiUEAdptpEH5kvO/rsr6Het1.DK5vout0gxaFNVkA.5hRe', 1, 0, '2026-03-28 00:41:02', '2026-03-28 00:41:02', NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_types`
--

CREATE TABLE `user_types` (
  `id` int(11) NOT NULL,
  `type_name` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_types`
--

INSERT INTO `user_types` (`id`, `type_name`, `created_at`) VALUES
(1, 'Standard', '2026-02-27 15:49:47'),
(2, 'Premium', '2026-02-27 15:49:47'),
(3, 'guest', '2026-03-07 03:04:31');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bills`
--
ALTER TABLE `bills`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invite_code` (`invite_code`),
  ADD UNIQUE KEY `share_token` (`share_token`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `email_verifications`
--
ALTER TABLE `email_verifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `fk_verification_user` (`user_id`),
  ADD KEY `idx_verification_token` (`token`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bill_id` (`bill_id`),
  ADD KEY `paid_by_user_id` (`paid_by_user_id`),
  ADD KEY `paid_by_guest_id` (`paid_by_guest_id`);

--
-- Indexes for table `expense_splits`
--
ALTER TABLE `expense_splits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expense_id` (`expense_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `guest_user_id` (`guest_user_id`);

--
-- Indexes for table `guest_users`
--
ALTER TABLE `guest_users`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `involved_persons`
--
ALTER TABLE `involved_persons`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bill_id` (`bill_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `guest_user_id` (`guest_user_id`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `settlements`
--
ALTER TABLE `settlements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bill_id` (`bill_id`),
  ADD KEY `paid_by_user_id` (`paid_by_user_id`),
  ADD KEY `paid_by_guest_id` (`paid_by_guest_id`),
  ADD KEY `paid_to_user_id` (`paid_to_user_id`),
  ADD KEY `paid_to_guest_id` (`paid_to_guest_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nickname` (`nickname`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `fk_users_user_type` (`user_type_id`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_username` (`username`);

--
-- Indexes for table `user_types`
--
ALTER TABLE `user_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type_name` (`type_name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bills`
--
ALTER TABLE `bills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `email_verifications`
--
ALTER TABLE `email_verifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `expense_splits`
--
ALTER TABLE `expense_splits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `guest_users`
--
ALTER TABLE `guest_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `involved_persons`
--
ALTER TABLE `involved_persons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `settlements`
--
ALTER TABLE `settlements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `user_types`
--
ALTER TABLE `user_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bills`
--
ALTER TABLE `bills`
  ADD CONSTRAINT `bills_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `email_verifications`
--
ALTER TABLE `email_verifications`
  ADD CONSTRAINT `fk_verification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`paid_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `expenses_ibfk_3` FOREIGN KEY (`paid_by_guest_id`) REFERENCES `guest_users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `expense_splits`
--
ALTER TABLE `expense_splits`
  ADD CONSTRAINT `expense_splits_ibfk_1` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `expense_splits_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `expense_splits_ibfk_3` FOREIGN KEY (`guest_user_id`) REFERENCES `guest_users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `involved_persons`
--
ALTER TABLE `involved_persons`
  ADD CONSTRAINT `involved_persons_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `involved_persons_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `involved_persons_ibfk_3` FOREIGN KEY (`guest_user_id`) REFERENCES `guest_users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD CONSTRAINT `password_resets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `settlements`
--
ALTER TABLE `settlements`
  ADD CONSTRAINT `settlements_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `settlements_ibfk_2` FOREIGN KEY (`paid_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `settlements_ibfk_3` FOREIGN KEY (`paid_by_guest_id`) REFERENCES `guest_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `settlements_ibfk_4` FOREIGN KEY (`paid_to_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `settlements_ibfk_5` FOREIGN KEY (`paid_to_guest_id`) REFERENCES `guest_users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_user_type` FOREIGN KEY (`user_type_id`) REFERENCES `user_types` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
