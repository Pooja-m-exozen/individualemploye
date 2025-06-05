'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch,  FaSpinner, FaPaperPlane, FaTimesCircle } from 'react-icons/fa';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface NewTicket {
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  category: string;
}

const HelpDeskPage = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newTicket, setNewTicket] = useState<NewTicket>({
    subject: '',
    description: '',
    priority: 'Medium' as const,
    category: 'Technical Support'
  });

  // Simulated ticket data
  useEffect(() => {
    const mockTickets: Ticket[] = [
      {
        id: 'TKT-001',
        subject: 'Unable to access email',
        description: 'I am unable to access my work email since this morning.',
        status: 'Open',
        priority: 'High',
        category: 'Technical Support',
        createdAt: '2024-03-15T09:00:00',
        updatedAt: '2024-03-15T09:00:00'
      },
      {
        id: 'TKT-002',
        subject: 'Salary slip not received',
        description: 'I have not received my salary slip for the month of February.',
        status: 'In Progress',
        priority: 'Medium',
        category: 'HR Support',
        createdAt: '2024-03-14T15:30:00',
        updatedAt: '2024-03-15T10:00:00'
      }
    ];
    setTickets(mockTickets);
  }, []);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const ticket: Ticket = {
        id: `TKT-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        ...newTicket,
        status: 'Open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setTickets(prev => [ticket, ...prev]);
      setCreateModalOpen(false);
      setNewTicket({
        subject: '',
        description: '',
        priority: 'Medium' as const,
        category: 'Technical Support'
      });
      setLoading(false);
    }, 1000);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-blue-100 text-blue-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 relative">
      {/* Upcoming Feature Overlay */}
      <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md mx-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Coming Soon!</h2>
          <p className="text-gray-600">
  Our help desk feature is currently under development. We&#39;re working hard to bring you a seamless support experience.
</p>

          <div className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium">
            Launching Soon
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Help Desk</h1>
          <p className="mt-2 text-gray-600">Manage and track your support tickets</p>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center gap-2"
            >
              <FaPlus className="text-sm" />
              <span>New Ticket</span>
            </button>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="min-w-full">
            <div className="grid grid-cols-1 gap-4 p-4">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex flex-wrap gap-4 justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{ticket.subject}</h3>
                        <span className="text-sm text-gray-500">#{ticket.id}</span>
                      </div>
                      <p className="mt-2 text-gray-600">{ticket.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                          {ticket.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>Created: {new Date(ticket.createdAt).toLocaleDateString()}</div>
                      <div>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTickets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No tickets found matching your criteria
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Ticket</h2>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
                >
                  <FaTimesCircle className="text-xl" />
                </button>
              </div>
              <form onSubmit={handleCreateTicket}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      required
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      required
                      rows={4}
                      value={newTicket.description}
                      onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        id="priority"
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div> */}
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        id="category"
                        value={newTicket.category}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Technical Support">Technical Support</option>
                        <option value="HR Support">HR Support</option>
                        <option value="Financial Support">Financial Support</option>
                        <option value="General Inquiry">General Inquiry</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <FaPaperPlane />
                        <span>Submit Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpDeskPage; 