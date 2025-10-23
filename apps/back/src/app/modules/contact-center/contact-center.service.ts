import { Injectable } from '@nestjs/common';

export type OperatorStatus = {
  id: string;
  name: string;
  status: 'idle' | 'on_call' | 'wrap_up' | 'offline';
  currentCall?: string | null;
  avgHandleTime?: number;
};

export type QueueStatus = {
  id: string;
  name: string;
  waiting: number;
  longestWaitingSeconds: number;
  callsInService: number;
};

@Injectable()
export class ContactCenterService {
  private operators: OperatorStatus[] = [
    { id: 'op1', name: 'Иван Петров', status: 'idle', currentCall: null, avgHandleTime: 210 },
    { id: 'op2', name: 'Мария Иванова', status: 'on_call', currentCall: 'Call #1234', avgHandleTime: 180 },
    { id: 'op3', name: 'Сергей Сидоров', status: 'wrap_up', currentCall: null, avgHandleTime: 240 },
  ];

  private queues: QueueStatus[] = [
    { id: 'q1', name: 'Продажи', waiting: 2, longestWaitingSeconds: 40, callsInService: 3 },
    { id: 'q2', name: 'Поддержка', waiting: 5, longestWaitingSeconds: 120, callsInService: 6 },
  ];

  getOperatorsSnapshot() {
    return this.operators;
  }

  getQueuesSnapshot() {
    return this.queues;
  }

  // For demo: mutate and return updated state (caller/gateway will call periodically)
  tick() {
    // rotate operator statuses for demo
    this.operators = this.operators.map((op, i) => ({
      ...op,
      status: (['idle', 'on_call', 'wrap_up', 'offline'] as OperatorStatus['status'][])[
        (i + Math.floor(Math.random() * 4)) % 4
      ],
      currentCall: Math.random() > 0.6 ? `Call #${Math.floor(Math.random() * 10000)}` : null,
    }));

    this.queues = this.queues.map((q, i) => ({
      ...q,
      waiting: Math.max(0, q.waiting + Math.floor(Math.random() * 3) - 1),
      longestWaitingSeconds: Math.max(0, q.longestWaitingSeconds + Math.floor(Math.random() * 11) - 5),
      callsInService: Math.max(0, q.callsInService + Math.floor(Math.random() * 2) - 1),
    }));

    return { operators: this.operators, queues: this.queues };
  }
}
