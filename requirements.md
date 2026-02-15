# ChargeNet - Requirements Document

## Project Overview

**Project Name:** ChargeNet - Smart EV Charging Platform

**Version:** 1.0.0

**Date:** February 15, 2026

**Team:** ChargeNet Development Team

---

## Executive Summary

ChargeNet is a comprehensive electric vehicle (EV) charging platform that connects EV drivers with charging station hosts. The platform addresses critical challenges in the EV ecosystem including limited charging infrastructure, emergency situations, and environmental impact monetization through an innovative carbon credit trading system.

---

## 1. Problem Statement

### 1.1 Current Challenges

1. **Limited Charging Infrastructure**
   - EV drivers struggle to locate available charging stations
   - No centralized platform for charger discovery
   - Lack of real-time availability information

2. **Emergency Situations**
   - Stranded EVs with depleted batteries have no immediate help
   - No standardized emergency rescue service
   - Unpredictable pricing for emergency assistance

3. **Environmental Impact**
   - EV users cannot monetize their environmental contributions
   - No mechanism to trade carbon credits earned from green transportation
   - Lack of incentives for sustainable driving behavior

4. **Host Challenges**
   - Charger owners cannot easily share their infrastructure
   - No platform to manage bookings and earnings
   - Limited visibility for private charging stations

---

## 2. Solution Overview

ChargeNet provides a comprehensive platform with the following core capabilities:

- Real-time charger discovery with interactive maps
- Instant booking system with flexible time slots
- Emergency rescue service with fixed pricing (₹500)
- Carbon credit trading marketplace
- Seamless payment integration via Razorpay
- Live updates using WebSocket technology
- Analytics dashboards for drivers and hosts

---

## 3. Functional Requirements

### 3.1 User Management

#### 3.1.1 User Registration
- **FR-UM-001:** System shall allow users to register with email, name, phone, and password
- **FR-UM-002:** System shall support three user types: Driver, Host, and Passenger
- **FR-UM-003:** System shall collect vehicle information for drivers (type, model)
- **FR-UM-004:** System shall validate email uniqueness
- **FR-UM-005:** System shall hash passwords using bcrypt before storage
- **FR-UM-006:** System shall auto-login users after successful registration

#### 3.1.2 User Authentication
- **FR-UM-007:** System shall provide secure login with email and password
- **FR-UM-008:** System shall use JWT tokens for session management
- **FR-UM-009:** System shall maintain session state across page refreshes
- **FR-UM-010:** System shall provide logout functionality
- **FR-UM-011:** System shall implement password reset functionality

#### 3.1.3 User Profile
- **FR-UM-012:** Users shall be able to view and edit their profile information
- **FR-UM-013:** System shall display user statistics (bookings, earnings, carbon credits)
- **FR-UM-014:** Users shall be able to update vehicle information
- **FR-UM-015:** System shall track total distance traveled for carbon credit calculation

---

### 3.2 Charger Management

#### 3.2.1 Charger Discovery (Driver)
- **FR-CM-001:** System shall display all available chargers on an interactive map
- **FR-CM-002:** System shall show charger details: name, location, plug type, power, price
- **FR-CM-003:** System shall filter chargers by plug type, power rating, and price range
- **FR-CM-004:** System shall display real-time availability status
- **FR-CM-005:** System shall show distance from user's current location
- **FR-CM-006:** System shall provide search functionality by location name

#### 3.2.2 Charger Listing (Host)
- **FR-CM-007:** Hosts shall be able to add new charging stations
- **FR-CM-008:** System shall collect: name, location, coordinates, plug type, power, price
- **FR-CM-009:** System shall allow hosts to mark chargers as green energy sources
- **FR-CM-010:** Hosts shall be able to update charger information
- **FR-CM-011:** Hosts shall be able to delete their chargers
- **FR-CM-012:** System shall validate all required fields before submission

#### 3.2.3 Charger Availability
- **FR-CM-013:** System shall track charger availability in real-time
- **FR-CM-014:** System shall automatically mark chargers as unavailable during bookings
- **FR-CM-015:** System shall restore availability after booking completion
- **FR-CM-016:** Hosts shall be able to manually toggle availability

---

### 3.3 Booking System

#### 3.3.1 Booking Creation
- **FR-BS-001:** Drivers shall be able to book available chargers
- **FR-BS-002:** System shall collect: charger ID, start time, duration, vehicle details
- **FR-BS-003:** System shall calculate total price based on duration and charger rate
- **FR-BS-004:** System shall prevent double-booking of chargers
- **FR-BS-005:** System shall validate booking time slots
- **FR-BS-006:** System shall create Razorpay payment order for bookings

#### 3.3.2 Booking Management
- **FR-BS-007:** Drivers shall view all their bookings (past and upcoming)
- **FR-BS-008:** Hosts shall view all bookings for their chargers
- **FR-BS-009:** System shall display booking status: pending, confirmed, in-progress, completed, cancelled
- **FR-BS-010:** Hosts shall be able to accept or reject booking requests
- **FR-BS-011:** Drivers shall be able to cancel bookings before start time
- **FR-BS-012:** System shall process refunds for cancelled bookings

#### 3.3.3 Booking Notifications
- **FR-BS-013:** System shall send real-time notifications for new bookings (WebSocket)
- **FR-BS-014:** System shall notify drivers when bookings are accepted/rejected
- **FR-BS-015:** System shall send reminders before booking start time
- **FR-BS-016:** System shall update booking status in real-time

---

### 3.4 Emergency Rescue System

#### 3.4.1 Rescue Request (Driver)
- **FR-ER-001:** Drivers shall be able to request emergency rescue
- **FR-ER-002:** System shall capture current GPS location automatically
- **FR-ER-003:** System shall collect: vehicle details, battery level, location name
- **FR-ER-004:** System shall set fixed price at ₹500 for all rescue requests
- **FR-ER-005:** System shall broadcast rescue requests to all nearby hosts
- **FR-ER-006:** Drivers shall view rescue request status in real-time

#### 3.4.2 Rescue Response (Host)
- **FR-ER-007:** Hosts shall receive real-time notifications for nearby rescue requests
- **FR-ER-008:** Hosts shall view rescue request details: location, vehicle, battery level
- **FR-ER-009:** Hosts shall be able to accept rescue requests
- **FR-ER-010:** System shall allow only one host to accept each request
- **FR-ER-011:** Hosts shall provide estimated arrival time upon acceptance
- **FR-ER-012:** Hosts shall update rescue status: accepted, in-progress, completed

#### 3.4.3 Rescue Tracking
- **FR-ER-013:** System shall track rescue status through all stages
- **FR-ER-014:** Drivers shall see host details after acceptance (name, phone, ETA)
- **FR-ER-015:** System shall send real-time updates via WebSocket
- **FR-ER-016:** System shall process payment upon rescue completion
- **FR-ER-017:** Both parties shall be able to cancel rescue requests with valid reasons

---

### 3.5 Carbon Credit Trading System

#### 3.5.1 Carbon Credit Calculation
- **FR-CC-001:** System shall calculate carbon credits based on distance traveled
- **FR-CC-002:** Formula: 1 km = 100g CO₂ saved
- **FR-CC-003:** System shall award 1 carbon credit per 1000 kg CO₂ saved (10,000 km)
- **FR-CC-004:** Drivers shall be able to add distance traveled manually
- **FR-CC-005:** System shall track total distance, CO₂ saved, and credits earned
- **FR-CC-006:** System shall maintain separate counters for earned and sold credits

#### 3.5.2 Credit Listing
- **FR-CC-007:** Users shall be able to list carbon credits for sale
- **FR-CC-008:** System shall collect: credit amount, price per credit
- **FR-CC-009:** System shall calculate total price automatically
- **FR-CC-010:** System shall validate user has sufficient credits to list
- **FR-CC-011:** Users shall view all their active listings
- **FR-CC-012:** Users shall be able to cancel listings before sale

#### 3.5.3 Credit Marketplace
- **FR-CC-013:** System shall display all active credit listings
- **FR-CC-014:** Marketplace shall show: seller name, credit amount, price, total
- **FR-CC-015:** Users shall be able to purchase credits from marketplace
- **FR-CC-016:** System shall process payment via Razorpay for credit purchases
- **FR-CC-017:** System shall transfer credits from seller to buyer upon payment
- **FR-CC-018:** System shall update seller's earnings and sold credits counter
- **FR-CC-019:** System shall send real-time notifications for new listings and sales

#### 3.5.4 Progress Milestones
- **FR-CC-020:** System shall track progress towards milestone goals
- **FR-CC-021:** Milestones: 1k, 2k, 3k, 4k, 5k credits
- **FR-CC-022:** System shall display progress percentage and next milestone
- **FR-CC-023:** System shall unlock rewards at each milestone

---

### 3.6 Payment Integration

#### 3.6.1 Payment Processing
- **FR-PI-001:** System shall integrate with Razorpay payment gateway
- **FR-PI-002:** System shall support test mode and live mode
- **FR-PI-003:** System shall create payment orders for: bookings, rescues, credit purchases
- **FR-PI-004:** System shall verify payment signatures for security
- **FR-PI-005:** System shall handle payment success and failure scenarios
- **FR-PI-006:** System shall process refunds for cancelled bookings

#### 3.6.2 Payment Tracking
- **FR-PI-007:** System shall store payment details: order ID, payment ID, amount
- **FR-PI-008:** Users shall view payment history
- **FR-PI-009:** Hosts shall track earnings from bookings and rescues
- **FR-PI-010:** System shall calculate platform fees (if applicable)

---

### 3.7 Real-time Communication

#### 3.7.1 WebSocket Integration
- **FR-RT-001:** System shall establish WebSocket connections for real-time updates
- **FR-RT-002:** System shall maintain user-specific rooms for targeted notifications
- **FR-RT-003:** System shall broadcast updates for: bookings, rescues, credit listings
- **FR-RT-004:** System shall handle connection drops and reconnections gracefully
- **FR-RT-005:** System shall emit events for all state changes

#### 3.7.2 Notifications
- **FR-RT-006:** Users shall receive instant notifications for relevant events
- **FR-RT-007:** Hosts shall receive notifications for: new bookings, rescue requests
- **FR-RT-008:** Drivers shall receive notifications for: booking confirmations, rescue updates
- **FR-RT-009:** All users shall receive notifications for credit marketplace activity

---

### 3.8 Analytics and Reporting

#### 3.8.1 Driver Dashboard
- **FR-AR-001:** Drivers shall view total bookings count
- **FR-AR-002:** Drivers shall view total distance traveled
- **FR-AR-003:** Drivers shall view carbon credits earned and sold
- **FR-AR-004:** Drivers shall view total spending on bookings
- **FR-AR-005:** Drivers shall view booking history with details

#### 3.8.2 Host Dashboard
- **FR-AR-006:** Hosts shall view total earnings from bookings and rescues
- **FR-AR-007:** Hosts shall view number of chargers listed
- **FR-AR-008:** Hosts shall view total bookings received
- **FR-AR-009:** Hosts shall view rescue requests completed
- **FR-AR-010:** Hosts shall view carbon credits earned from green energy
- **FR-AR-011:** Hosts shall view booking trends and analytics

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements

- **NFR-PF-001:** System shall load pages within 3 seconds on standard internet connection
- **NFR-PF-002:** API responses shall be returned within 500ms for 95% of requests
- **NFR-PF-003:** System shall support at least 1000 concurrent users
- **NFR-PF-004:** Database queries shall be optimized with proper indexing
- **NFR-PF-005:** WebSocket connections shall maintain sub-second latency

### 4.2 Security Requirements

- **NFR-SC-001:** All passwords shall be hashed using bcrypt with salt rounds ≥ 10
- **NFR-SC-002:** JWT tokens shall expire after 24 hours
- **NFR-SC-003:** All API endpoints shall validate authentication tokens
- **NFR-SC-004:** Payment data shall be handled securely via Razorpay
- **NFR-SC-005:** System shall prevent SQL injection and XSS attacks
- **NFR-SC-006:** HTTPS shall be enforced for all production traffic
- **NFR-SC-007:** CORS shall be configured to allow only trusted origins

### 4.3 Reliability Requirements

- **NFR-RL-001:** System shall have 99% uptime
- **NFR-RL-002:** Database shall be backed up daily
- **NFR-RL-003:** System shall handle errors gracefully with user-friendly messages
- **NFR-RL-004:** Failed transactions shall be logged for manual review
- **NFR-RL-005:** System shall recover from crashes without data loss

### 4.4 Usability Requirements

- **NFR-US-001:** Interface shall be intuitive and require no training
- **NFR-US-002:** System shall provide clear error messages and validation feedback
- **NFR-US-003:** Mobile responsive design shall work on devices ≥ 320px width
- **NFR-US-004:** Color contrast shall meet WCAG 2.1 AA standards
- **NFR-US-005:** Loading states shall be displayed for all async operations

### 4.5 Scalability Requirements

- **NFR-SL-001:** System architecture shall support horizontal scaling
- **NFR-SL-002:** Database shall handle growth to 100,000+ users
- **NFR-SL-003:** API shall be stateless to enable load balancing
- **NFR-SL-004:** Static assets shall be served via CDN

### 4.6 Compatibility Requirements

- **NFR-CP-001:** Frontend shall support Chrome, Firefox, Safari, Edge (latest 2 versions)
- **NFR-CP-002:** System shall work on iOS and Android mobile browsers
- **NFR-CP-003:** Backend shall run on Node.js 16.x or higher
- **NFR-CP-004:** Database shall use MongoDB 4.x or higher

---

## 5. System Constraints

### 5.1 Technical Constraints

- **TC-001:** Frontend must be built with React and TypeScript
- **TC-002:** Backend must use Node.js with Express framework
- **TC-003:** Database must be MongoDB Atlas
- **TC-004:** Payment gateway must be Razorpay
- **TC-005:** Real-time communication must use Socket.io

### 5.2 Business Constraints

- **BC-001:** Emergency rescue price is fixed at ₹500
- **BC-002:** Carbon credit calculation: 1 km = 100g CO₂ saved
- **BC-003:** 1 carbon credit = 1000 kg CO₂ saved (10,000 km)
- **BC-004:** Platform operates in test mode initially

### 5.3 Regulatory Constraints

- **RC-001:** System must comply with data protection regulations
- **RC-002:** Payment processing must follow PCI DSS standards
- **RC-003:** User data must be stored securely and not shared without consent

---

## 6. User Roles and Permissions

### 6.1 Driver Role

**Permissions:**
- Register and login
- View all chargers on map
- Book chargers
- Request emergency rescue
- Add distance traveled
- Earn and trade carbon credits
- View personal dashboard and analytics
- Make payments

### 6.2 Host Role

**Permissions:**
- Register and login
- Add, edit, delete chargers
- View and manage booking requests
- Accept/reject bookings
- Respond to emergency rescue requests
- Earn from bookings and rescues
- List and sell carbon credits
- View host dashboard and analytics
- Receive payments

### 6.3 Passenger Role

**Permissions:**
- Register and login
- View chargers (limited functionality)
- View carbon credit marketplace
- Basic profile management

---

## 7. Data Requirements

### 7.1 Data Entities

1. **User**
   - Personal information (name, email, phone)
   - Authentication credentials
   - User type and vehicle details
   - Carbon credit statistics
   - Timestamps

2. **Charger**
   - Host reference
   - Location and coordinates
   - Technical specifications (plug type, power)
   - Pricing and availability
   - Green energy flag

3. **Booking**
   - Driver and charger references
   - Time slot (start time, duration)
   - Status and payment details
   - Vehicle information

4. **Rescue Request**
   - Requester reference
   - Location and coordinates
   - Vehicle and battery details
   - Status and accepted host
   - Pricing and timing

5. **Carbon Credit Listing**
   - Seller reference
   - Credit amount and pricing
   - Status (active, sold, cancelled)
   - Buyer reference and sale timestamp

### 7.2 Data Retention

- User accounts: Retained until user requests deletion
- Bookings: Retained for 2 years for analytics
- Rescue requests: Retained for 1 year
- Carbon credit transactions: Retained permanently for audit
- Payment records: Retained for 7 years (regulatory requirement)

---

## 8. Integration Requirements

### 8.1 External Services

1. **MongoDB Atlas**
   - Cloud database hosting
   - Automatic backups
   - Connection string authentication

2. **Razorpay**
   - Payment order creation
   - Payment verification
   - Refund processing
   - Test and live mode support

3. **Google Maps API (Optional)**
   - Map display
   - Location search
   - Geocoding services

### 8.2 API Requirements

- RESTful API design
- JSON request/response format
- JWT token authentication
- Proper HTTP status codes
- Error handling and validation
- API documentation

---

## 9. Testing Requirements

### 9.1 Unit Testing

- Test individual functions and components
- Minimum 70% code coverage
- Test edge cases and error scenarios

### 9.2 Integration Testing

- Test API endpoints
- Test database operations
- Test payment integration
- Test WebSocket communication

### 9.3 User Acceptance Testing

- Test complete user workflows
- Verify all functional requirements
- Test on multiple devices and browsers
- Gather user feedback

---

## 10. Deployment Requirements

### 10.1 Frontend Deployment

- Platform: Vercel
- Build command: `npm run build`
- Environment variables configured
- Custom domain support (optional)

### 10.2 Backend Deployment

- Platform: Render
- Node.js runtime
- Environment variables configured
- Auto-deploy on git push
- Health check endpoint

### 10.3 Database

- MongoDB Atlas cloud hosting
- IP whitelist configuration
- Connection string security
- Regular backups enabled

---

## 11. Maintenance Requirements

- Regular security updates
- Performance monitoring
- Bug fixes and patches
- Feature enhancements based on user feedback
- Database optimization
- Log monitoring and analysis

---

## 12. Future Enhancements

1. **Mobile Application**
   - Native iOS and Android apps
   - Push notifications
   - Offline mode support

2. **AI-based Features**
   - Route optimization
   - Demand prediction
   - Dynamic pricing

3. **Advanced Analytics**
   - Detailed reports and insights
   - Predictive analytics
   - Business intelligence dashboard

4. **Blockchain Integration**
   - Blockchain-based carbon credits
   - Smart contracts for transactions
   - Transparent credit tracking

5. **Fleet Management**
   - Corporate accounts
   - Bulk booking management
   - Fleet analytics

6. **Multi-language Support**
   - Internationalization
   - Regional payment methods
   - Local currency support

---

## 13. Success Metrics

### 13.1 User Metrics

- Number of registered users (target: 10,000 in 6 months)
- Daily active users (target: 30% of registered users)
- User retention rate (target: 60% after 3 months)

### 13.2 Business Metrics

- Total bookings completed (target: 5,000 in 6 months)
- Total rescue requests fulfilled (target: 500 in 6 months)
- Carbon credits traded (target: 1,000 credits in 6 months)
- Platform revenue (target: ₹5,00,000 in 6 months)

### 13.3 Technical Metrics

- System uptime (target: 99%)
- Average response time (target: < 500ms)
- Error rate (target: < 1%)
- Payment success rate (target: > 95%)

---

## 14. Glossary

- **EV**: Electric Vehicle
- **SOS**: Emergency rescue request
- **Carbon Credit**: Unit representing 1000 kg CO₂ saved
- **Host**: User who lists charging stations
- **Driver**: User who books charging stations
- **WebSocket**: Protocol for real-time bidirectional communication
- **JWT**: JSON Web Token for authentication
- **API**: Application Programming Interface
- **CORS**: Cross-Origin Resource Sharing

---

## 15. Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Feb 15, 2026 | ChargeNet Team | Initial requirements document |

**Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Lead | [Name] | _________ | ______ |
| Technical Lead | [Name] | _________ | ______ |
| Product Owner | [Name] | _________ | ______ |

---

**End of Requirements Document**
