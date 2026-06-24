import { EventEmitter } from 'events';

// Create a single shared instance of EventEmitter
const eventBus = new EventEmitter();

// Log events in development mode for observability
eventBus.on('rideCompleted', ({ rideId }) => {
  console.log(`📢 [EventBus] Event emitted: rideCompleted (rideId: ${rideId})`);
});

export default eventBus;
