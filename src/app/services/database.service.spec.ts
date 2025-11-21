import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';
import Dexie from 'dexie';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(async () => {
    // Clear any existing database
    try {
      const db = new DatabaseService();
      await db.close();
      await Dexie.delete('VibingDB');
    } catch (e) {
      // Ignore errors during cleanup
    }
    
    TestBed.configureTestingModule({
      providers: [DatabaseService]
    });
    service = TestBed.inject(DatabaseService);
    
    // Initialize default lists
    await service.initializeDefaultLists();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await service.close();
    } catch (e) {
      // Ignore errors during cleanup
    }
    
    try {
      await Dexie.delete('VibingDB');
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Loading entries', () => {
    it('should load all tickets', async () => {
      // Add some test tickets
      await service.addTicket({
        title: 'Test Ticket 1',
        description: 'Description 1',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });
      await service.addTicket({
        title: 'Test Ticket 2',
        description: 'Description 2',
        listId: 'in-progress',
        order: 0,
        createdAt: new Date()
      });

      const tickets = await service.getAllTickets();
      expect(tickets.length).toBe(2);
      expect(tickets[0].title).toBe('Test Ticket 1');
      expect(tickets[1].title).toBe('Test Ticket 2');
    });

    it('should load tickets by list', async () => {
      // Add tickets to different lists
      await service.addTicket({
        title: 'Todo Ticket',
        description: 'Todo Description',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });
      await service.addTicket({
        title: 'In Progress Ticket',
        description: 'In Progress Description',
        listId: 'in-progress',
        order: 0,
        createdAt: new Date()
      });
      await service.addTicket({
        title: 'Another Todo Ticket',
        description: 'Another Todo Description',
        listId: 'todo',
        order: 1,
        createdAt: new Date()
      });

      const todoTickets = await service.getTicketsByList('todo');
      expect(todoTickets.length).toBe(2);
      expect(todoTickets[0].listId).toBe('todo');
      expect(todoTickets[1].listId).toBe('todo');

      const inProgressTickets = await service.getTicketsByList('in-progress');
      expect(inProgressTickets.length).toBe(1);
      expect(inProgressTickets[0].listId).toBe('in-progress');
    });

    it('should load tickets ordered by order property', async () => {
      // Add tickets in random order
      await service.addTicket({
        title: 'Third Ticket',
        description: 'Third',
        listId: 'todo',
        order: 2,
        createdAt: new Date()
      });
      await service.addTicket({
        title: 'First Ticket',
        description: 'First',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });
      await service.addTicket({
        title: 'Second Ticket',
        description: 'Second',
        listId: 'todo',
        order: 1,
        createdAt: new Date()
      });

      const tickets = await service.getTicketsByList('todo');
      expect(tickets.length).toBe(3);
      expect(tickets[0].title).toBe('First Ticket');
      expect(tickets[1].title).toBe('Second Ticket');
      expect(tickets[2].title).toBe('Third Ticket');
    });

    it('should load all lists', async () => {
      const lists = await service.getAllLists();
      expect(lists.length).toBe(3);
      expect(lists[0].id).toBe('todo');
      expect(lists[1].id).toBe('in-progress');
      expect(lists[2].id).toBe('done');
    });
  });

  describe('Deleting entries', () => {
    it('should delete a ticket by id', async () => {
      const ticketId = await service.addTicket({
        title: 'Ticket to Delete',
        description: 'Will be deleted',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      let tickets = await service.getAllTickets();
      expect(tickets.length).toBe(1);

      await service.deleteTicket(ticketId);

      tickets = await service.getAllTickets();
      expect(tickets.length).toBe(0);
    });

    it('should only delete the specified ticket', async () => {
      const ticketId1 = await service.addTicket({
        title: 'Ticket 1',
        description: 'Keep this',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });
      const ticketId2 = await service.addTicket({
        title: 'Ticket 2',
        description: 'Delete this',
        listId: 'todo',
        order: 1,
        createdAt: new Date()
      });
      await service.addTicket({
        title: 'Ticket 3',
        description: 'Keep this too',
        listId: 'todo',
        order: 2,
        createdAt: new Date()
      });

      await service.deleteTicket(ticketId2);

      const tickets = await service.getAllTickets();
      expect(tickets.length).toBe(2);
      expect(tickets.find(t => t.id === ticketId1)).toBeTruthy();
      expect(tickets.find(t => t.id === ticketId2)).toBeUndefined();
    });
  });

  describe('Moving tickets between lists', () => {
    it('should move a ticket to a different list', async () => {
      const ticketId = await service.addTicket({
        title: 'Movable Ticket',
        description: 'Will be moved',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      await service.moveTicket(ticketId, 'in-progress', 0);

      const tickets = await service.getAllTickets();
      const movedTicket = tickets.find(t => t.id === ticketId);
      expect(movedTicket?.listId).toBe('in-progress');
      expect(movedTicket?.order).toBe(0);
    });

    it('should update ticket order when moving', async () => {
      const ticketId = await service.addTicket({
        title: 'Ticket to Move',
        description: 'Will be moved',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      await service.moveTicket(ticketId, 'done', 5);

      const ticket = await service.tickets.get(ticketId);
      expect(ticket?.listId).toBe('done');
      expect(ticket?.order).toBe(5);
    });

    it('should reorder tickets within a list', async () => {
      const ticketId1 = await service.addTicket({
        title: 'Ticket 1',
        description: 'First',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });
      const ticketId2 = await service.addTicket({
        title: 'Ticket 2',
        description: 'Second',
        listId: 'todo',
        order: 1,
        createdAt: new Date()
      });
      const ticketId3 = await service.addTicket({
        title: 'Ticket 3',
        description: 'Third',
        listId: 'todo',
        order: 2,
        createdAt: new Date()
      });

      // Reorder: swap first and last
      await service.reorderTickets('todo', [ticketId3, ticketId2, ticketId1]);

      const tickets = await service.getTicketsByList('todo');
      expect(tickets[0].id).toBe(ticketId3);
      expect(tickets[0].order).toBe(0);
      expect(tickets[1].id).toBe(ticketId2);
      expect(tickets[1].order).toBe(1);
      expect(tickets[2].id).toBe(ticketId1);
      expect(tickets[2].order).toBe(2);
    });

    it('should handle moving ticket to empty list', async () => {
      const ticketId = await service.addTicket({
        title: 'Lonely Ticket',
        description: 'Moving to empty list',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      await service.moveTicket(ticketId, 'done', 0);

      const doneTickets = await service.getTicketsByList('done');
      expect(doneTickets.length).toBe(1);
      expect(doneTickets[0].id).toBe(ticketId);
    });
  });

  describe('Adding and updating tickets', () => {
    it('should add a new ticket', async () => {
      const ticketId = await service.addTicket({
        title: 'New Ticket',
        description: 'New Description',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      expect(ticketId).toBeTypeOf('number');
      const ticket = await service.tickets.get(ticketId);
      expect(ticket?.title).toBe('New Ticket');
    });

    it('should update ticket properties', async () => {
      const ticketId = await service.addTicket({
        title: 'Original Title',
        description: 'Original Description',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      await service.updateTicket(ticketId, {
        title: 'Updated Title',
        description: 'Updated Description'
      });

      const ticket = await service.tickets.get(ticketId);
      expect(ticket?.title).toBe('Updated Title');
      expect(ticket?.description).toBe('Updated Description');
    });
  });
});
