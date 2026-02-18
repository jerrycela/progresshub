// Mock database
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    taskNote: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import prisma from '../../../src/config/database';
import { TaskNoteService } from '../../../src/services/taskNoteService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('TaskNoteService', () => {
  const service = new TaskNoteService();

  const mockNote = {
    id: 'note-001',
    taskId: 'task-001',
    content: '這是一則備註',
    authorId: 'emp-001',
    authorName: '測試員工',
    authorRole: 'EMPLOYEE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNotesByTaskId', () => {
    it('應回傳任務的註記列表（依建立時間降序）', async () => {
      (mockedPrisma.taskNote.findMany as jest.Mock).mockResolvedValue([mockNote]);

      const result = await service.getNotesByTaskId('task-001');

      expect(result).toEqual([mockNote]);
      expect(mockedPrisma.taskNote.findMany).toHaveBeenCalledWith({
        where: { taskId: 'task-001' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('無註記時應回傳空陣列', async () => {
      (mockedPrisma.taskNote.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getNotesByTaskId('task-001');

      expect(result).toEqual([]);
    });
  });

  describe('createNote', () => {
    it('應建立任務註記', async () => {
      (mockedPrisma.taskNote.create as jest.Mock).mockResolvedValue(mockNote);

      const result = await service.createNote({
        taskId: 'task-001',
        content: '這是一則備註',
        authorId: 'emp-001',
        authorName: '測試員工',
        authorRole: 'EMPLOYEE',
      });

      expect(result).toEqual(mockNote);
      expect(mockedPrisma.taskNote.create).toHaveBeenCalledWith({
        data: {
          taskId: 'task-001',
          content: '這是一則備註',
          authorId: 'emp-001',
          authorName: '測試員工',
          authorRole: 'EMPLOYEE',
        },
      });
    });
  });
});
