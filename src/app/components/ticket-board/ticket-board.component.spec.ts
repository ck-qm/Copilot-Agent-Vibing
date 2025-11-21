import { TestBed, ComponentFixture } from '@angular/core/testing';
import { TicketBoardComponent } from './ticket-board.component';
import { DatabaseService } from '../../services/database.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import Dexie from 'dexie';

describe('TicketBoardComponent', () => {
  let component: TicketBoardComponent;
  let fixture: ComponentFixture<TicketBoardComponent>;
  let dbService: DatabaseService;

  beforeEach(async () => {
    // Clear any existing database
    try {
      const db = new DatabaseService();
      await db.close();
      await Dexie.delete('VibingDB');
    } catch (e) {
      // Ignore errors during cleanup
    }

    await TestBed.configureTestingModule({
      imports: [TicketBoardComponent],
      providers: [DatabaseService]
    }).compileComponents();

    fixture = TestBed.createComponent(TicketBoardComponent);
    component = fixture.componentInstance;
    dbService = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await dbService.close();
    } catch (e) {
      // Ignore errors during cleanup
    }
    
    try {
      await Dexie.delete('VibingDB');
    } catch (e) {
      // Ignore errors during cleanup
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component initialization', () => {
    it('should initialize default lists on ngOnInit', async () => {
      await component.ngOnInit();
      
      const lists = component.lists();
      expect(lists.length).toBe(3);
      expect(lists[0].id).toBe('todo');
      expect(lists[1].id).toBe('in-progress');
      expect(lists[2].id).toBe('done');
    });

    it('should load data on initialization', async () => {
      // Add a test ticket before initialization
      await dbService.initializeDefaultLists();
      await dbService.addTicket({
        title: 'Test Ticket',
        description: 'Test Description',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      await component.ngOnInit();

      const tickets = component.ticketsByList();
      expect(tickets['todo'].length).toBe(1);
      expect(tickets['todo'][0].title).toBe('Test Ticket');
    });

    it('should group tickets by list', async () => {
      await dbService.initializeDefaultLists();
      await dbService.addTicket({
        title: 'Todo Ticket',
        description: 'Todo',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });
      await dbService.addTicket({
        title: 'In Progress Ticket',
        description: 'In Progress',
        listId: 'in-progress',
        order: 0,
        createdAt: new Date()
      });
      await dbService.addTicket({
        title: 'Done Ticket',
        description: 'Done',
        listId: 'done',
        order: 0,
        createdAt: new Date()
      });

      await component.ngOnInit();

      const tickets = component.ticketsByList();
      expect(tickets['todo'].length).toBe(1);
      expect(tickets['in-progress'].length).toBe(1);
      expect(tickets['done'].length).toBe(1);
    });
  });

  describe('Deleting tickets', () => {
    it('should delete a ticket', async () => {
      await component.ngOnInit();
      
      const ticketId = await dbService.addTicket({
        title: 'Ticket to Delete',
        description: 'Will be deleted',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      await component.loadData();
      let tickets = component.ticketsByList()['todo'];
      expect(tickets.length).toBe(1);

      await component.deleteTicket(ticketId);
      
      tickets = component.ticketsByList()['todo'];
      expect(tickets.length).toBe(0);
    });

    it('should handle deleting ticket with undefined id', async () => {
      await component.ngOnInit();
      
      // Should not throw error
      await component.deleteTicket(undefined);
      
      const tickets = component.ticketsByList()['todo'];
      expect(tickets).toBeDefined();
    });

    it('should reload data after deleting a ticket', async () => {
      await component.ngOnInit();
      
      const ticketId1 = await dbService.addTicket({
        title: 'Ticket 1',
        description: 'First',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });
      const ticketId2 = await dbService.addTicket({
        title: 'Ticket 2',
        description: 'Second',
        listId: 'todo',
        order: 1,
        createdAt: new Date()
      });

      await component.loadData();
      expect(component.ticketsByList()['todo'].length).toBe(2);

      await component.deleteTicket(ticketId1);
      
      const tickets = component.ticketsByList()['todo'];
      expect(tickets.length).toBe(1);
      expect(tickets[0].id).toBe(ticketId2);
    });
  });

  describe('Adding tickets', () => {
    it('should add a new ticket', async () => {
      await component.ngOnInit();
      
      component.newTicketTitle['todo'] = 'New Ticket';
      component.newTicketDescription['todo'] = 'New Description';

      await component.addTicket('todo');

      const tickets = component.ticketsByList()['todo'];
      expect(tickets.length).toBe(1);
      expect(tickets[0].title).toBe('New Ticket');
      expect(tickets[0].description).toBe('New Description');
    });

    it('should not add ticket with empty title', async () => {
      await component.ngOnInit();
      
      component.newTicketTitle['todo'] = '   ';
      component.newTicketDescription['todo'] = 'Description';

      await component.addTicket('todo');

      const tickets = component.ticketsByList()['todo'];
      expect(tickets.length).toBe(0);
    });

    it('should clear form after adding ticket', async () => {
      await component.ngOnInit();
      
      component.newTicketTitle['todo'] = 'New Ticket';
      component.newTicketDescription['todo'] = 'New Description';
      component.showAddForm['todo'] = true;

      await component.addTicket('todo');

      expect(component.newTicketTitle['todo']).toBe('');
      expect(component.newTicketDescription['todo']).toBe('');
      expect(component.showAddForm['todo']).toBe(false);
    });

    it('should toggle add form', () => {
      component.toggleAddForm('todo');
      expect(component.showAddForm['todo']).toBe(true);

      component.toggleAddForm('todo');
      expect(component.showAddForm['todo']).toBe(false);
    });

    it('should clear form fields when toggling form off', () => {
      component.newTicketTitle['todo'] = 'Some Title';
      component.newTicketDescription['todo'] = 'Some Description';
      component.showAddForm['todo'] = true;

      component.toggleAddForm('todo');

      expect(component.newTicketTitle['todo']).toBe('');
      expect(component.newTicketDescription['todo']).toBe('');
    });
  });

  describe('Drag and drop - moving tickets', () => {
    it('should reorder tickets within the same list', async () => {
      await component.ngOnInit();
      
      const ticketId1 = await dbService.addTicket({
        title: 'First',
        description: 'First ticket',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });
      const ticketId2 = await dbService.addTicket({
        title: 'Second',
        description: 'Second ticket',
        listId: 'todo',
        order: 1,
        createdAt: new Date()
      });
      const ticketId3 = await dbService.addTicket({
        title: 'Third',
        description: 'Third ticket',
        listId: 'todo',
        order: 2,
        createdAt: new Date()
      });

      await component.loadData();
      const todoTickets = component.ticketsByList()['todo'];

      // Simulate drag drop: move first item to last position
      const event: Partial<CdkDragDrop<any[]>> = {
        previousContainer: { id: 'todo', data: todoTickets } as any,
        container: { id: 'todo', data: todoTickets } as any,
        previousIndex: 0,
        currentIndex: 2
      };

      await component.drop(event as CdkDragDrop<any[]>);

      const reorderedTickets = component.ticketsByList()['todo'];
      expect(reorderedTickets[0].title).toBe('Second');
      expect(reorderedTickets[1].title).toBe('Third');
      expect(reorderedTickets[2].title).toBe('First');
    });

    it('should move ticket to a different list', async () => {
      await component.ngOnInit();
      
      const ticketId = await dbService.addTicket({
        title: 'Movable Ticket',
        description: 'Will be moved',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      await component.loadData();
      const todoTickets = component.ticketsByList()['todo'];
      const inProgressTickets = component.ticketsByList()['in-progress'];

      // Simulate drag drop: move from todo to in-progress
      const event: Partial<CdkDragDrop<any[]>> = {
        previousContainer: { id: 'todo', data: todoTickets } as any,
        container: { id: 'in-progress', data: inProgressTickets } as any,
        previousIndex: 0,
        currentIndex: 0
      };

      await component.drop(event as CdkDragDrop<any[]>);

      const updatedTodoTickets = component.ticketsByList()['todo'];
      const updatedInProgressTickets = component.ticketsByList()['in-progress'];
      
      expect(updatedTodoTickets.length).toBe(0);
      expect(updatedInProgressTickets.length).toBe(1);
      expect(updatedInProgressTickets[0].title).toBe('Movable Ticket');
      expect(updatedInProgressTickets[0].listId).toBe('in-progress');
    });

    it('should move ticket to different list and maintain order', async () => {
      await component.ngOnInit();
      
      // Add tickets to in-progress list
      await dbService.addTicket({
        title: 'In Progress 1',
        description: 'First in progress',
        listId: 'in-progress',
        order: 0,
        createdAt: new Date()
      });
      await dbService.addTicket({
        title: 'In Progress 2',
        description: 'Second in progress',
        listId: 'in-progress',
        order: 1,
        createdAt: new Date()
      });

      // Add ticket to todo list
      const movableTicketId = await dbService.addTicket({
        title: 'Todo Ticket',
        description: 'Will be moved',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      await component.loadData();
      const todoTickets = component.ticketsByList()['todo'];
      const inProgressTickets = component.ticketsByList()['in-progress'];

      // Move todo ticket to middle of in-progress list
      const event: Partial<CdkDragDrop<any[]>> = {
        previousContainer: { id: 'todo', data: todoTickets } as any,
        container: { id: 'in-progress', data: inProgressTickets } as any,
        previousIndex: 0,
        currentIndex: 1
      };

      await component.drop(event as CdkDragDrop<any[]>);

      const updatedInProgressTickets = component.ticketsByList()['in-progress'];
      expect(updatedInProgressTickets.length).toBe(3);
      expect(updatedInProgressTickets[0].title).toBe('In Progress 1');
      expect(updatedInProgressTickets[1].title).toBe('Todo Ticket');
      expect(updatedInProgressTickets[2].title).toBe('In Progress 2');
    });

    it('should update database when moving tickets', async () => {
      await component.ngOnInit();
      
      const ticketId = await dbService.addTicket({
        title: 'Test Ticket',
        description: 'Test',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      });

      await component.loadData();
      const todoTickets = component.ticketsByList()['todo'];
      const doneTickets = component.ticketsByList()['done'];

      // Move from todo to done
      const event: Partial<CdkDragDrop<any[]>> = {
        previousContainer: { id: 'todo', data: todoTickets } as any,
        container: { id: 'done', data: doneTickets } as any,
        previousIndex: 0,
        currentIndex: 0
      };

      await component.drop(event as CdkDragDrop<any[]>);

      // Verify in database
      const ticket = await dbService.tickets.get(ticketId);
      expect(ticket?.listId).toBe('done');
    });
  });

  describe('Helper methods', () => {
    it('should get list ids', async () => {
      await component.ngOnInit();
      
      const listIds = component.getListIds();
      expect(listIds).toEqual(['todo', 'in-progress', 'done']);
    });

    it('should track tickets by id', () => {
      const ticket = {
        id: 123,
        title: 'Test',
        description: 'Test',
        listId: 'todo',
        order: 0,
        createdAt: new Date()
      };

      const trackingId = component.trackByTicketId(0, ticket);
      expect(trackingId).toBe(123);
    });

    it('should track lists by id', () => {
      const list = {
        id: 'test-list',
        name: 'Test List',
        order: 0
      };

      const trackingId = component.trackByListId(0, list);
      expect(trackingId).toBe('test-list');
    });
  });
});
