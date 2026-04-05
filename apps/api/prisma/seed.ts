/**
 * Prisma Seed Script
 * Creates sample data for development and testing
 */

import { PrismaClient, BookingModel, BookingType, UserRole, BookingSource, BookingStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning existing data...');
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.hourlySlot.deleteMany();
  await prisma.roomInventory.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.sEOMeta.deleteMany();
  await prisma.media.deleteMany();
  await prisma.user.deleteMany();
  await prisma.hotel.deleteMany();

  // ============================================
  // CREATE HOTELS
  // ============================================
  console.log('🏨 Creating hotels...');

  const radhikaResort = await prisma.hotel.create({
    data: {
      name: 'Radhika Resort',
      slug: 'radhika-resort',
      description: 'Welcome to Radhika Resort, a luxurious beachfront property offering world-class amenities and breathtaking ocean views. Perfect for family vacations, romantic getaways, and business retreats.',
      address: '123 Beach Road, Mandarmani',
      city: 'Mandarmani',
      state: 'West Bengal',
      country: 'India',
      pincode: '721655',
      latitude: 21.6701,
      longitude: 87.7000,
      phone: '+91 9876543210',
      email: 'info@radhikaresort.in',
      whatsapp: '+91 9876543210',
      logoUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200',
      heroImageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1600',
      starRating: 4,
      bookingModel: BookingModel.BOTH,
      checkInTime: '14:00',
      checkOutTime: '12:00',
      hourlyMinHours: 3,
      hourlyMaxHours: 12,
      isActive: true,
      themeConfig: {
        primaryColor: '#1e40af',
        accentColor: '#f59e0b',
        fontFamily: 'Inter',
      },
    },
  });

  const oceanView = await prisma.hotel.create({
    data: {
      name: 'Ocean View Hotel',
      slug: 'ocean-view-hotel',
      description: 'Experience luxury at Ocean View Hotel with stunning sea views, premium amenities, and exceptional service.',
      address: '456 Marine Drive',
      city: 'Puri',
      state: 'Odisha',
      country: 'India',
      pincode: '752001',
      latitude: 19.7983,
      longitude: 85.8249,
      phone: '+91 9876543211',
      email: 'info@oceanviewhotel.in',
      logoUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=200',
      heroImageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600',
      starRating: 5,
      bookingModel: BookingModel.DAILY,
      checkInTime: '15:00',
      checkOutTime: '11:00',
      isActive: true,
    },
  });

  const hillsideInn = await prisma.hotel.create({
    data: {
      name: 'Hillside Inn',
      slug: 'hillside-inn',
      description: 'Cozy mountain retreat with panoramic views and warm hospitality.',
      address: '789 Hill Station Road',
      city: 'Darjeeling',
      state: 'West Bengal',
      country: 'India',
      pincode: '734101',
      latitude: 27.0410,
      longitude: 88.2663,
      phone: '+91 9876543212',
      email: 'stay@hillsideinn.in',
      logoUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=200',
      heroImageUrl: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1600',
      starRating: 3,
      bookingModel: BookingModel.DAILY,
      checkInTime: '14:00',
      checkOutTime: '12:00',
      isActive: true,
    },
  });

  // ============================================
  // CREATE ROOM TYPES
  // ============================================
  console.log('🛏️ Creating room types...');

  const deluxeOcean = await prisma.roomType.create({
    data: {
      hotelId: radhikaResort.id,
      name: 'Deluxe Ocean View',
      slug: 'deluxe-ocean-view',
      description: 'Spacious room with private balcony overlooking the ocean. Features king-size bed, premium bath amenities, and modern decor.',
      basePriceDaily: 4999,
      basePriceHourly: 799,
      maxGuests: 2,
      maxExtraGuests: 1,
      extraGuestCharge: 500,
      totalRooms: 10,
      amenities: ['wifi', 'ac', 'tv', 'minibar', 'room-service', 'safe', 'ocean-view', 'balcony'],
      images: [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
      ],
      isActive: true,
      sortOrder: 1,
    },
  });

  const standardRoom = await prisma.roomType.create({
    data: {
      hotelId: radhikaResort.id,
      name: 'Standard Room',
      slug: 'standard-room',
      description: 'Comfortable room with modern amenities. Perfect for business travelers and short stays.',
      basePriceDaily: 2499,
      basePriceHourly: 449,
      maxGuests: 2,
      maxExtraGuests: 0,
      extraGuestCharge: 0,
      totalRooms: 15,
      amenities: ['wifi', 'ac', 'tv', 'room-service'],
      images: [
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
      ],
      isActive: true,
      sortOrder: 2,
    },
  });

  const familySuite = await prisma.roomType.create({
    data: {
      hotelId: radhikaResort.id,
      name: 'Family Suite',
      slug: 'family-suite',
      description: 'Large suite with separate living area, perfect for families. Features two bedrooms and full kitchen.',
      basePriceDaily: 8999,
      basePriceHourly: null,
      maxGuests: 4,
      maxExtraGuests: 2,
      extraGuestCharge: 800,
      totalRooms: 5,
      amenities: ['wifi', 'ac', 'tv', 'minibar', 'room-service', 'safe', 'ocean-view', 'balcony', 'kitchenette', 'living-room'],
      images: [
        'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      ],
      isActive: true,
      sortOrder: 3,
    },
  });

  // Ocean View Hotel rooms
  await prisma.roomType.createMany({
    data: [
      {
        hotelId: oceanView.id,
        name: 'Premium Suite',
        slug: 'premium-suite',
        description: 'Luxurious suite with panoramic ocean views and premium amenities.',
        basePriceDaily: 12999,
        basePriceHourly: null,
        maxGuests: 2,
        maxExtraGuests: 1,
        totalRooms: 5,
        amenities: ['wifi', 'ac', 'tv', 'minibar', 'jacuzzi', 'room-service', 'butler'],
        images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'],
        isActive: true,
        sortOrder: 1,
      },
      {
        hotelId: oceanView.id,
        name: 'Executive Room',
        slug: 'executive-room',
        description: 'Elegant room with work desk and city views.',
        basePriceDaily: 7999,
        basePriceHourly: null,
        maxGuests: 2,
        maxExtraGuests: 0,
        totalRooms: 12,
        amenities: ['wifi', 'ac', 'tv', 'minibar', 'work-desk'],
        images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800'],
        isActive: true,
        sortOrder: 2,
      },
    ],
  });

  // ============================================
  // CREATE PHYSICAL ROOMS
  // ============================================
  console.log('🚪 Creating physical rooms...');

  // Deluxe Ocean View rooms (101-110)
  for (let i = 1; i <= 10; i++) {
    await prisma.room.create({
      data: {
        hotelId: radhikaResort.id,
        roomTypeId: deluxeOcean.id,
        roomNumber: `10${i}`,
        floor: 1,
        status: 'AVAILABLE',
      },
    });
  }

  // Standard rooms (201-215)
  for (let i = 1; i <= 15; i++) {
    await prisma.room.create({
      data: {
        hotelId: radhikaResort.id,
        roomTypeId: standardRoom.id,
        roomNumber: `2${i.toString().padStart(2, '0')}`,
        floor: 2,
        status: i === 5 ? 'MAINTENANCE' : 'AVAILABLE', // One room under maintenance
      },
    });
  }

  // Family suites (301-305)
  for (let i = 1; i <= 5; i++) {
    await prisma.room.create({
      data: {
        hotelId: radhikaResort.id,
        roomTypeId: familySuite.id,
        roomNumber: `30${i}`,
        floor: 3,
        status: 'AVAILABLE',
      },
    });
  }

  // ============================================
  // CREATE ROOM INVENTORY (next 30 days)
  // ============================================
  console.log('📅 Creating room inventory...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    await prisma.roomInventory.createMany({
      data: [
        {
          roomTypeId: deluxeOcean.id,
          date,
          availableCount: 10,
          priceOverride: isWeekend ? 5999 : null, // Weekend surcharge
          minStayNights: isWeekend ? 2 : 1,
          isClosed: false,
        },
        {
          roomTypeId: standardRoom.id,
          date,
          availableCount: 14, // One room under maintenance
          priceOverride: isWeekend ? 2999 : null,
          minStayNights: 1,
          isClosed: false,
        },
        {
          roomTypeId: familySuite.id,
          date,
          availableCount: 5,
          priceOverride: isWeekend ? 10999 : null,
          minStayNights: isWeekend ? 2 : 1,
          isClosed: false,
        },
      ],
    });
  }

  // ============================================
  // CREATE USERS
  // ============================================
  console.log('👤 Creating users...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Hotel admin (main admin user)
  const hotelAdmin = await prisma.user.create({
    data: {
      email: 'admin@hotel.local',
      phone: '+919876543210',
      password: hashedPassword,
      name: 'Hotel Admin',
      role: UserRole.HOTEL_ADMIN,
      hotelId: radhikaResort.id,
      isActive: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  // Sample guests
  const guest1 = await prisma.user.create({
    data: {
      email: 'guest@example.com',
      phone: '+919123456789',
      password: hashedPassword,
      name: 'John Doe',
      role: UserRole.GUEST,
      isActive: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const guest2 = await prisma.user.create({
    data: {
      email: 'jane@example.com',
      phone: '+919234567890',
      password: hashedPassword,
      name: 'Jane Smith',
      role: UserRole.GUEST,
      isActive: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  // ============================================
  // CREATE SAMPLE BOOKINGS
  // ============================================
  console.log('📋 Creating sample bookings...');

  const booking1 = await prisma.booking.create({
    data: {
      bookingNumber: 'BK-20260301-A1B2',
      hotelId: radhikaResort.id,
      guestId: guest1.id,
      roomTypeId: deluxeOcean.id,
      bookingType: BookingType.DAILY,
      checkInDate: new Date('2026-03-05'),
      checkOutDate: new Date('2026-03-08'),
      numRooms: 1,
      numGuests: 2,
      numExtraGuests: 0,
      roomTotal: 14997,
      taxes: 2699,
      totalAmount: 17696,
      source: BookingSource.DIRECT,
      status: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      guestName: 'John Doe',
      guestEmail: 'guest@example.com',
      guestPhone: '+919123456789',
      specialRequests: 'Late check-in requested',
    },
  });

  await prisma.booking.create({
    data: {
      bookingNumber: 'BK-20260302-C3D4',
      hotelId: radhikaResort.id,
      guestId: guest2.id,
      roomTypeId: standardRoom.id,
      bookingType: BookingType.HOURLY,
      checkInDate: new Date('2026-03-10'),
      checkInTime: '10:00',
      checkOutTime: '16:00',
      numHours: 6,
      numRooms: 1,
      numGuests: 2,
      roomTotal: 2694,
      taxes: 485,
      totalAmount: 3179,
      source: BookingSource.DIRECT,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      guestName: 'Jane Smith',
      guestEmail: 'jane@example.com',
      guestPhone: '+919234567890',
    },
  });

  // ============================================
  // CREATE REVIEWS
  // ============================================
  console.log('⭐ Creating reviews...');

  await prisma.review.create({
    data: {
      hotelId: radhikaResort.id,
      bookingId: booking1.id,
      guestId: guest1.id,
      rating: 5,
      title: 'Amazing stay!',
      comment: 'The ocean view was breathtaking. Staff was extremely helpful and the food was delicious. Will definitely come back!',
      photos: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800'],
      isVerified: true,
      isPublished: true,
    },
  });

  // ============================================
  // CREATE SEO META
  // ============================================
  console.log('🔍 Creating SEO metadata...');

  await prisma.sEOMeta.createMany({
    data: [
      {
        hotelId: radhikaResort.id,
        pageSlug: 'homepage',
        metaTitle: 'Radhika Resort - Luxury Beach Resort in Mandarmani | Book Now',
        metaDescription: 'Experience luxury at Radhika Resort, Mandarmani\'s premier beachfront property. Ocean view rooms, world-class amenities, and exceptional service. Book your stay today!',
        ogImageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200',
      },
      {
        hotelId: radhikaResort.id,
        pageSlug: 'rooms',
        metaTitle: 'Rooms & Suites - Radhika Resort | Luxury Accommodations',
        metaDescription: 'Choose from our selection of deluxe rooms and family suites with ocean views, premium amenities, and hourly booking options.',
      },
    ],
  });

  // ============================================
  // CREATE MEDIA
  // ============================================
  console.log('📸 Creating media entries...');

  await prisma.media.createMany({
    data: [
      {
        hotelId: radhikaResort.id,
        url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1600',
        thumbnailUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400',
        type: 'IMAGE',
        category: 'HOTEL',
        altText: 'Radhika Resort beachfront view',
        sortOrder: 1,
      },
      {
        hotelId: radhikaResort.id,
        url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600',
        thumbnailUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
        type: 'IMAGE',
        category: 'HOTEL',
        altText: 'Radhika Resort pool area',
        sortOrder: 2,
      },
      {
        hotelId: radhikaResort.id,
        url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1600',
        thumbnailUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400',
        type: 'IMAGE',
        category: 'ROOM',
        altText: 'Deluxe ocean view room',
        sortOrder: 1,
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Hotels: 3`);
  console.log(`   - Room Types: 5`);
  console.log(`   - Physical Rooms: 30`);
  console.log(`   - Users: 3`);
  console.log(`   - Bookings: 2`);
  console.log(`   - Reviews: 1`);
  console.log('\n🔐 Test Credentials:');
  console.log('   Hotel Admin: admin@hotel.local / password123');
  console.log('   Guest: guest@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
