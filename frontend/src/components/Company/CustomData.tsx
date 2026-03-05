import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Filter,
  Tag,
  Globe,
  FileText,
  Settings,
  Users,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Home,
  Package,
  Calendar,
  HelpCircle,
  Eye,
  Layers,
  Zap,
  BookOpen,
  UserCircle,
  ShoppingBag,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Clock,
  Star
} from 'lucide-react';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface Schema {
  id: string;
  schema_name: string;
  schema_version: string;
  schema_definition: any;
  country_code?: string;
  region?: string;
  is_active: boolean;
  created_at: string;
}

interface CustomDataEntry {
  id: string;
  data: any;
  tags: string[];
  status: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  schema_name: string;
}

interface Agent {
  id: string;
  name: string;
}

const CustomData: React.FC = () => {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [dataEntries, setDataEntries] = useState<CustomDataEntry[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text');
  const [activeView, setActiveView] = useState<'schemas' | 'data' | 'agents' | 'mcp'>('schemas');
  
  // Schema form state
  const [showSchemaForm, setShowSchemaForm] = useState(false);
  const [schemaForm, setSchemaForm] = useState({
    schema_name: '',
    country_code: '',
    region: '',
    schema_definition: ''
  });

  // Data entry form state
  const [showDataForm, setShowDataForm] = useState(false);
  const [dataForm, setDataForm] = useState({
    data: '',
    tags: '',
    status: 'active'
  });
  const [useRealEstateForm, setUseRealEstateForm] = useState(false);
  const [realEstateForm, setRealEstateForm] = useState({
    id: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    address_country: 'USA',
    property_type: 'house',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    price: '',
    currency: 'USD',
    listing_status: 'active',
    description: '',
    features: '',
    year_built: '',
    lot_size: '',
    mls_number: ''
  });

  // Agent access state
  const [agentAccesses, setAgentAccesses] = useState<any[]>([]);
  const [showAgentAccessForm, setShowAgentAccessForm] = useState(false);
  const [agentAccessForm, setAgentAccessForm] = useState<{
    agent_id: string;
    schema_id: string;
    access_level: string;
    filters: any;
  }>({
    agent_id: '',
    schema_id: '',
    access_level: 'read',
    filters: {}
  });

  // MCP integrations state
  const [mcpIntegrations, setMcpIntegrations] = useState<any[]>([]);
  const [showMcpForm, setShowMcpForm] = useState(false);
  const [mcpForm, setMcpForm] = useState<{
    integration_name: string;
    integration_type: string;
    config: string;
    capabilities: string[];
  }>({
    integration_name: '',
    integration_type: 'vector_db',
    config: '',
    capabilities: []
  });

  // Bulk import state
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportData, setBulkImportData] = useState('');
  const [bulkImportFormat, setBulkImportFormat] = useState<'json' | 'csv'>('json');

  // Template and help state
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSchemaVisualization, setShowSchemaVisualization] = useState(false);

  // Schema templates
  const schemaTemplates = {
    real_estate: {
      name: 'Real Estate',
      icon: Home,
      description: 'Property listings with address, price, features, and more',
      category: 'Business',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique property identifier' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zip: { type: 'string' },
              country: { type: 'string' }
            },
            required: ['street', 'city']
          },
          property_type: { type: 'string', enum: ['house', 'apartment', 'condo', 'townhouse', 'land'] },
          bedrooms: { type: 'number' },
          bathrooms: { type: 'number' },
          square_feet: { type: 'number' },
          price: { type: 'number' },
          currency: { type: 'string', default: 'USD' },
          listing_status: { type: 'string', enum: ['active', 'pending', 'sold', 'off_market'] },
          description: { type: 'string' },
          features: { type: 'array', items: { type: 'string' } },
          year_built: { type: 'number' },
          lot_size: { type: 'number' },
          mls_number: { type: 'string' }
        },
        required: ['id', 'address', 'price']
      }
    },
    inventory: {
      name: 'Product Inventory',
      icon: Package,
      description: 'Track products, stock levels, and pricing',
      category: 'Business',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          sku: { type: 'string' },
          category: { type: 'string' },
          price: { type: 'number' },
          cost: { type: 'number' },
          stock_quantity: { type: 'number' },
          description: { type: 'string' },
          supplier: { type: 'string' },
          location: { type: 'string' }
        },
        required: ['id', 'name', 'sku']
      }
    },
    appointments: {
      name: 'Appointments',
      icon: Calendar,
      description: 'Schedule and manage appointments or bookings',
      category: 'Business',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customer_name: { type: 'string' },
          customer_email: { type: 'string' },
          customer_phone: { type: 'string' },
          appointment_date: { type: 'string', format: 'date-time' },
          duration_minutes: { type: 'number' },
          service_type: { type: 'string' },
          status: { type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'cancelled'] },
          notes: { type: 'string' }
        },
        required: ['id', 'customer_name', 'appointment_date']
      }
    },
    customers: {
      name: 'Customer Database',
      icon: UserCircle,
      description: 'Manage customer contacts, preferences, and history',
      category: 'CRM',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          company: { type: 'string' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              zip: { type: 'string' },
              country: { type: 'string' }
            }
          },
          customer_since: { type: 'string', format: 'date' },
          total_orders: { type: 'number' },
          total_spent: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' }
        },
        required: ['id', 'first_name', 'last_name', 'email']
      }
    },
    services: {
      name: 'Service Catalog',
      icon: ShoppingBag,
      description: 'List services offered with pricing and descriptions',
      category: 'Business',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          service_name: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          duration_minutes: { type: 'number' },
          requires_appointment: { type: 'boolean' },
          available_locations: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'service_name', 'price']
      }
    },
    employees: {
      name: 'Employee Directory',
      icon: Users,
      description: 'Store employee information and contact details',
      category: 'HR',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          position: { type: 'string' },
          department: { type: 'string' },
          hire_date: { type: 'string', format: 'date' },
          employee_id: { type: 'string' },
          manager: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'first_name', 'last_name', 'email', 'position']
      }
    },
    events: {
      name: 'Event Management',
      icon: Calendar,
      description: 'Track events, workshops, and meetings',
      category: 'Business',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          event_name: { type: 'string' },
          event_type: { type: 'string' },
          start_date: { type: 'string', format: 'date-time' },
          end_date: { type: 'string', format: 'date-time' },
          location: { type: 'string' },
          description: { type: 'string' },
          capacity: { type: 'number' },
          registered_count: { type: 'number' },
          price: { type: 'number' },
          organizer: { type: 'string' },
          status: { type: 'string', enum: ['upcoming', 'ongoing', 'completed', 'cancelled'] }
        },
        required: ['id', 'event_name', 'start_date']
      }
    },
    projects: {
      name: 'Project Management',
      icon: Briefcase,
      description: 'Track projects, tasks, and milestones',
      category: 'Business',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          project_name: { type: 'string' },
          client: { type: 'string' },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
          budget: { type: 'number' },
          status: { type: 'string', enum: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'] },
          project_manager: { type: 'string' },
          team_members: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          progress_percent: { type: 'number' }
        },
        required: ['id', 'project_name', 'client']
      }
    },
    testimonials: {
      name: 'Testimonials & Reviews',
      icon: Star,
      description: 'Store customer testimonials and reviews',
      category: 'Marketing',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customer_name: { type: 'string' },
          customer_title: { type: 'string' },
          company: { type: 'string' },
          rating: { type: 'number', minimum: 1, maximum: 5 },
          testimonial_text: { type: 'string' },
          service_used: { type: 'string' },
          date: { type: 'string', format: 'date' },
          approved: { type: 'boolean' },
          featured: { type: 'boolean' }
        },
        required: ['id', 'customer_name', 'testimonial_text', 'rating']
      }
    }
  };

  useEffect(() => {
    fetchSchemas();
    fetchAgents();
  }, []);

  useEffect(() => {
    if (selectedSchema) {
      fetchDataEntries(selectedSchema.schema_name);
    }
  }, [selectedSchema]);

  useEffect(() => {
    if (activeView === 'agents') {
      // Fetch all agent accesses when in agents view (no schema filter)
      // Use a small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        fetchAgentAccesses();
      }, 100);
      // Ensure agents and schemas are loaded when switching to agents view
      if (agents.length === 0) {
        fetchAgents();
      }
      if (schemas.length === 0) {
        fetchSchemas();
      }
      return () => clearTimeout(timer);
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'mcp') {
      fetchMcpIntegrations();
    }
  }, [activeView]);

  const fetchSchemas = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/custom-data/schemas');
      // Handle different response structures
      const fetchedSchemas = response.data?.data || response.data || [];
      console.log('Fetched schemas:', fetchedSchemas);
      const schemasArray = Array.isArray(fetchedSchemas) ? fetchedSchemas : [];
      setSchemas(schemasArray);
      return schemasArray;
    } catch (error: any) {
      console.error('Error fetching schemas:', error);
      toast.error('Failed to load schemas');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchDataEntries = async (schemaName: string, search?: string) => {
    try {
      setLoading(true);
      const params: any = { schema_name: schemaName, status: 'active' };
      if (search) {
        params.search = search;
      }
      const response = await apiService.get('/custom-data/data', { params });
      setDataEntries(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching data entries:', error);
      toast.error('Failed to load data entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await apiService.get('/company/agents');
      // Backend returns { success: true, data: { agents: [...] } }
      const agentsData = response.data?.data?.agents || response.data?.agents || response.data?.data || [];
      console.log('Fetched agents:', agentsData);
      setAgents(Array.isArray(agentsData) ? agentsData : []);
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
    }
  };

  const handleUseTemplate = (templateKey: string) => {
    const template = schemaTemplates[templateKey as keyof typeof schemaTemplates];
    if (template) {
      setSchemaForm({
        schema_name: templateKey,
        country_code: '',
        region: '',
        schema_definition: JSON.stringify(template.schema, null, 2)
      });
      setShowTemplates(false);
      setShowSchemaForm(true);
      toast.success(`Template "${template.name}" loaded!`);
    }
  };

  const handleCreateSchema = async () => {
    try {
      if (!schemaForm.schema_name || !schemaForm.schema_definition) {
        toast.error('Schema name and definition are required');
        return;
      }

      let schemaDefinition;
      try {
        schemaDefinition = JSON.parse(schemaForm.schema_definition);
      } catch (e) {
        toast.error('Invalid JSON in schema definition');
        return;
      }

      const response = await apiService.post('/custom-data/schemas', {
        schema_name: schemaForm.schema_name,
        country_code: schemaForm.country_code || undefined,
        region: schemaForm.region || undefined,
        schema_definition: schemaDefinition
      });

      // apiService.post returns response.data, so response is already { success: true, data: {...} }
      const createdSchema = response.data || response;
      const schemaName = schemaForm.schema_name;
      
      console.log('Schema creation response:', { response, createdSchema, schemaName });
      
      toast.success('Schema created successfully');
      setShowSchemaForm(false);
      setSchemaForm({ schema_name: '', country_code: '', region: '', schema_definition: '' });
      
      // Refresh schemas and auto-select the newly created one
      const updatedSchemas = await fetchSchemas();
      
      console.log('Updated schemas after fetch:', updatedSchemas);
      
      // Find the newly created schema - prioritize the created schema if it has all fields, otherwise find in list
      let newSchema: Schema | null = null;
      
      if (createdSchema && createdSchema.id && createdSchema.schema_name) {
        // Use the created schema if it has all required fields
        newSchema = createdSchema as Schema;
        console.log('Using created schema:', newSchema);
      } else if (updatedSchemas && updatedSchemas.length > 0) {
        // Otherwise, find it in the refreshed list
        newSchema = updatedSchemas.find((s: Schema) => s.schema_name === schemaName) || null;
        console.log('Found schema in list:', newSchema);
      }
      
      if (newSchema && newSchema.id) {
        // Ensure we have all required fields
        const schemaToSelect: Schema = {
          id: newSchema.id,
          schema_name: newSchema.schema_name,
          schema_version: newSchema.schema_version || '1.0',
          schema_definition: newSchema.schema_definition,
          country_code: newSchema.country_code,
          region: newSchema.region,
          is_active: newSchema.is_active !== undefined ? newSchema.is_active : true,
          created_at: newSchema.created_at || new Date().toISOString()
        };
        
        console.log('Selecting schema:', schemaToSelect);
        setSelectedSchema(schemaToSelect);
        setActiveView('data');
        toast.success(`Schema "${schemaName}" is now selected!`);
      } else {
        // Fallback: if schema not found, just switch to schemas view
        console.warn('Schema not found after creation:', { 
          response,
          createdSchema, 
          updatedSchemas, 
          schemaName,
          createdSchemaId: createdSchema?.id,
          createdSchemaName: createdSchema?.schema_name,
          updatedSchemasCount: updatedSchemas?.length
        });
        setActiveView('schemas');
        toast.success('Schema created! Please select it from the list.');
      }
    } catch (error: any) {
      console.error('Error creating schema:', error);
      toast.error(error.response?.data?.error || 'Failed to create schema');
    }
  };

  // Auto-detect if we should use real estate form
  useEffect(() => {
    if (selectedSchema) {
      const schemaName = selectedSchema.schema_name.toLowerCase();
      if (schemaName.includes('real_estate') || 
          schemaName.includes('real-estate') ||
          schemaName.includes('real estate') ||
          schemaName === 'real_estate') {
        setUseRealEstateForm(true);
      } else {
        setUseRealEstateForm(false);
      }
    }
  }, [selectedSchema]);

  const handleCreateDataEntry = async () => {
    try {
      if (!selectedSchema || !dataForm.data) {
        toast.error('Please select a schema and provide data');
        return;
      }

      let data;
      try {
        data = JSON.parse(dataForm.data);
      } catch (e) {
        toast.error('Invalid JSON in data field');
        return;
      }

      const tags = dataForm.tags.split(',').map(t => t.trim()).filter(t => t);

      await apiService.post('/custom-data/data', {
        schema_name: selectedSchema.schema_name,
        data,
        tags,
        status: dataForm.status
      });

      toast.success('Data entry created successfully');
      setShowDataForm(false);
      setDataForm({ data: '', tags: '', status: 'active' });
      fetchDataEntries(selectedSchema.schema_name);
    } catch (error: any) {
      console.error('Error creating data entry:', error);
      toast.error(error.response?.data?.error || 'Failed to create data entry');
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery || !selectedSchema) {
      toast.error('Please enter a search query and select a schema');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.post('/custom-data/data/search', {
        query: searchQuery,
        schema_name: selectedSchema.schema_name,
        threshold: 0.7,
        limit: 20
      });
      setDataEntries(response.data.data || []);
      toast.success(`Found ${response.data.data?.length || 0} results`);
    } catch (error: any) {
      console.error('Error in semantic search:', error);
      toast.error('Semantic search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTextSearch = () => {
    if (selectedSchema) {
      fetchDataEntries(selectedSchema.schema_name, searchQuery);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      await apiService.delete(`/custom-data/data/${entryId}`);
      toast.success('Entry deleted successfully');
      if (selectedSchema) {
        fetchDataEntries(selectedSchema.schema_name);
      }
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  const handleDeleteSchema = async (schemaId: string, schemaName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    const softDelete = confirm(
      `Delete schema "${schemaName}"?\n\n` +
      `Soft Delete (Recommended):\n` +
      `- Deactivates the schema\n` +
      `- Preserves all data and access grants\n` +
      `- Can be reactivated later\n\n` +
      `Click OK for Soft Delete, or Cancel and use Hard Delete for permanent removal.`
    );

    if (softDelete) {
      // Soft delete
      try {
        await apiService.delete(`/custom-data/schemas/${schemaId}`);
        toast.success('Schema deactivated successfully');
        await fetchSchemas();
        if (selectedSchema?.id === schemaId) {
          setSelectedSchema(null);
        }
      } catch (error: any) {
        console.error('Error deactivating schema:', error);
        toast.error(error.response?.data?.error || 'Failed to deactivate schema');
      }
    } else {
      // User wants hard delete
      const confirmHard = confirm(
        `⚠️ PERMANENT DELETION ⚠️\n\n` +
        `This will PERMANENTLY delete:\n` +
        `- The schema "${schemaName}"\n` +
        `- ALL data entries in this schema\n` +
        `- ALL agent access grants for this schema\n\n` +
        `This action CANNOT be undone!\n\n` +
        `Are you absolutely sure?`
      );

      if (confirmHard) {
        try {
          await apiService.delete(`/custom-data/schemas/${schemaId}?hardDelete=true`);
          toast.success('Schema permanently deleted');
          await fetchSchemas();
          if (selectedSchema?.id === schemaId) {
            setSelectedSchema(null);
          }
        } catch (error: any) {
          console.error('Error deleting schema:', error);
          toast.error(error.response?.data?.error || 'Failed to delete schema');
        }
      }
    }
  };

  // Agent Access Management
  const fetchAgentAccesses = async (schemaId?: string) => {
    try {
      const params: any = {};
      // Only filter by schema_id if explicitly provided or if we're in data view with selected schema
      // In agents view, show all accesses
      if (schemaId || (activeView === 'data' && selectedSchema)) {
        params.schema_id = schemaId || selectedSchema?.id;
      }
      const response = await apiService.get('/custom-data/agent-access', { params });
      const accesses = response.data?.data || response.data || [];
      console.log('Fetched agent accesses:', accesses, 'Response:', response);
      setAgentAccesses(Array.isArray(accesses) ? accesses : []);
    } catch (error: any) {
      console.error('Error fetching agent accesses:', error);
      toast.error('Failed to load agent accesses');
      setAgentAccesses([]);
    }
  };

  const handleGrantAgentAccess = async () => {
    try {
      if (!agentAccessForm.agent_id || !agentAccessForm.schema_id) {
        toast.error('Please select an agent and schema');
        return;
      }

      await apiService.post('/custom-data/agent-access', {
        ...agentAccessForm,
        filters: typeof agentAccessForm.filters === 'string' 
          ? JSON.parse(agentAccessForm.filters) 
          : agentAccessForm.filters
      });
      toast.success('Agent access granted successfully');
      setShowAgentAccessForm(false);
      setAgentAccessForm({ agent_id: '', schema_id: '', access_level: 'read', filters: {} });
      // Refresh the access list - fetch all accesses in agents view (no filter)
      // Use setTimeout to ensure backend has processed and state updates are complete
      setTimeout(async () => {
        console.log('Refreshing agent accesses after grant...');
        await fetchAgentAccesses();
        console.log('Agent accesses after refresh:', agentAccesses);
      }, 300);
    } catch (error: any) {
      console.error('Error granting agent access:', error);
      toast.error(error.response?.data?.error || 'Failed to grant access');
    }
  };

  const handleRevokeAgentAccess = async (accessId: string) => {
    if (!confirm('Are you sure you want to revoke this access?')) {
      return;
    }

    try {
      await apiService.delete(`/custom-data/agent-access/${accessId}`);
      toast.success('Access revoked successfully');
      fetchAgentAccesses();
    } catch (error: any) {
      console.error('Error revoking agent access:', error);
      toast.error(error.response?.data?.error || 'Failed to revoke access');
    }
  };

  // MCP Integration Management
  const fetchMcpIntegrations = async () => {
    try {
      const response = await apiService.get('/custom-data/mcp/integrations');
      setMcpIntegrations(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching MCP integrations:', error);
      toast.error('Failed to load MCP integrations');
    }
  };

  const handleCreateMcpIntegration = async () => {
    try {
      if (!mcpForm.integration_name || !mcpForm.integration_type || !mcpForm.config) {
        toast.error('Please fill in all required fields');
        return;
      }

      let config;
      try {
        config = JSON.parse(mcpForm.config);
      } catch (e) {
        toast.error('Invalid JSON in config field');
        return;
      }

      await apiService.post('/custom-data/mcp/integrations', {
        integration_name: mcpForm.integration_name,
        integration_type: mcpForm.integration_type,
        config,
        capabilities: mcpForm.capabilities
      });

      toast.success('MCP integration created successfully');
      setShowMcpForm(false);
      setMcpForm({ integration_name: '', integration_type: 'vector_db', config: '', capabilities: [] });
      fetchMcpIntegrations();
    } catch (error: any) {
      console.error('Error creating MCP integration:', error);
      toast.error(error.response?.data?.error || 'Failed to create integration');
    }
  };

  // Real Estate Form Handler
  const handleRealEstateSubmit = async () => {
    try {
      const data = {
        id: realEstateForm.id || `prop-${Date.now()}`,
        address: {
          street: realEstateForm.address_street,
          city: realEstateForm.address_city,
          state: realEstateForm.address_state,
          zip: realEstateForm.address_zip,
          country: realEstateForm.address_country
        },
        property_type: realEstateForm.property_type,
        bedrooms: realEstateForm.bedrooms ? parseInt(realEstateForm.bedrooms) : undefined,
        bathrooms: realEstateForm.bathrooms ? parseFloat(realEstateForm.bathrooms) : undefined,
        square_feet: realEstateForm.square_feet ? parseInt(realEstateForm.square_feet) : undefined,
        price: realEstateForm.price ? parseFloat(realEstateForm.price) : undefined,
        currency: realEstateForm.currency,
        listing_status: realEstateForm.listing_status,
        description: realEstateForm.description,
        features: realEstateForm.features.split(',').map(f => f.trim()).filter(f => f),
        year_built: realEstateForm.year_built ? parseInt(realEstateForm.year_built) : undefined,
        lot_size: realEstateForm.lot_size ? parseFloat(realEstateForm.lot_size) : undefined,
        mls_number: realEstateForm.mls_number
      };

      const tags = [
        realEstateForm.address_city?.toLowerCase().replace(/\s+/g, '-'),
        realEstateForm.property_type,
        realEstateForm.bedrooms ? `${realEstateForm.bedrooms}-bedroom` : null
      ].filter(Boolean) as string[];

      await apiService.post('/custom-data/data', {
        schema_name: selectedSchema?.schema_name,
        data,
        tags,
        status: 'active'
      });

      toast.success('Property added successfully');
      setShowDataForm(false);
      setUseRealEstateForm(false);
      setRealEstateForm({
        id: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_zip: '',
        address_country: 'USA',
        property_type: 'house',
        bedrooms: '',
        bathrooms: '',
        square_feet: '',
        price: '',
        currency: 'USD',
        listing_status: 'active',
        description: '',
        features: '',
        year_built: '',
        lot_size: '',
        mls_number: ''
      });
      if (selectedSchema) {
        fetchDataEntries(selectedSchema.schema_name);
      }
    } catch (error: any) {
      console.error('Error creating property:', error);
      toast.error(error.response?.data?.error || 'Failed to create property');
    }
  };

  // Bulk Import Handler
  const handleBulkImport = async () => {
    try {
      if (!bulkImportData || !selectedSchema) {
        toast.error('Please provide import data and select a schema');
        return;
      }

      let entries: any[] = [];
      
      if (bulkImportFormat === 'json') {
        try {
          entries = JSON.parse(bulkImportData);
          if (!Array.isArray(entries)) {
            entries = [entries];
          }
        } catch (e) {
          toast.error('Invalid JSON format');
          return;
        }
      } else {
        // CSV parsing
        const lines = bulkImportData.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          toast.error('CSV must have at least a header and one data row');
          return;
        }
        const headers = lines[0].split(',').map(h => h.trim());
        entries = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const entry: any = {};
          headers.forEach((header, idx) => {
            entry[header] = values[idx] || '';
          });
          return entry;
        });
      }

      // Import each entry
      let successCount = 0;
      let errorCount = 0;

      for (const entry of entries) {
        try {
          await apiService.post('/custom-data/data', {
            schema_name: selectedSchema.schema_name,
            data: entry,
            tags: [],
            status: 'active'
          });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      toast.success(`Imported ${successCount} entries${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setShowBulkImport(false);
      setBulkImportData('');
      if (selectedSchema) {
        fetchDataEntries(selectedSchema.schema_name);
      }
    } catch (error: any) {
      console.error('Error in bulk import:', error);
      toast.error('Bulk import failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Database className="h-6 w-6 mr-2 text-purple-400" />
            Custom Business Data
          </h2>
          <p className="text-gray-400 mt-1">
            Manage industry-specific data (real estate, inventory, etc.) for your AI agents
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('schemas')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'schemas'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Schemas
          </button>
          <button
            onClick={() => setActiveView('data')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'data'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Database className="h-4 w-4 inline mr-2" />
            Data
          </button>
          <button
            onClick={() => setActiveView('agents')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'agents'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Agent Access
          </button>
          <button
            onClick={() => setActiveView('mcp')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'mcp'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Sparkles className="h-4 w-4 inline mr-2" />
            MCP Integrations
          </button>
        </div>
      </div>

      {/* Schemas View */}
      {activeView === 'schemas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-semibold text-white">Data Schemas</h3>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Help & Instructions"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Layers className="h-4 w-4 mr-2" />
                Use Template
              </button>
              <button
                onClick={() => setShowSchemaForm(!showSchemaForm)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Schema
              </button>
            </div>
          </div>

          {/* Help Modal */}
          {showHelp && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <BookOpen className="h-6 w-6 mr-2" />
                    Custom Data Guide
                  </h2>
                  <button
                    onClick={() => setShowHelp(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6 text-gray-300">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">What is Custom Data?</h3>
                    <p className="mb-3">
                      Custom Data allows you to store industry-specific information that your AI agents can access and use when helping customers. 
                      This is perfect for businesses like real estate agencies, retail stores, service providers, and more.
                    </p>
                    <p>
                      <strong className="text-white">Example:</strong> A real estate agent can store all their property listings here, and when a customer asks 
                      "Do you have any 3-bedroom houses under $500k?", the AI agent can search through this data and provide accurate answers.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">Getting Started</h3>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li><strong className="text-white">Choose a Template:</strong> Click "Use Template" to select from pre-built schemas (Real Estate, Inventory, Appointments)</li>
                      <li><strong className="text-white">Or Create Custom:</strong> Click "Create Schema" to define your own data structure using JSON Schema</li>
                      <li><strong className="text-white">Add Data:</strong> Once a schema is created, go to the "Data" tab and add entries</li>
                      <li><strong className="text-white">Grant Access:</strong> Use the "Agent Access" tab to allow specific AI agents to use this data</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Schema Templates</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      We provide {Object.keys(schemaTemplates).length} pre-built templates organized by category. 
                      Simply select a template and customize it to your needs.
                    </p>
                    <div className="space-y-6">
                      {['Business', 'CRM', 'HR', 'Marketing'].map((category) => {
                        const categoryTemplates = Object.entries(schemaTemplates).filter(
                          ([_, template]) => template.category === category
                        );
                        
                        if (categoryTemplates.length === 0) return null;
                        
                        return (
                          <div key={category}>
                            <h4 className="text-lg font-semibold text-white mb-3">{category}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {categoryTemplates.map(([key, template]) => {
                                const Icon = template.icon;
                                return (
                                  <div key={key} className="bg-gray-700 rounded-lg p-4">
                                    <div className="flex items-start space-x-3">
                                      <div className="bg-purple-600/20 p-2 rounded-lg flex-shrink-0">
                                        <Icon className="h-6 w-6 text-purple-400" />
                                      </div>
                                      <div>
                                        <h5 className="font-semibold text-white mb-1">{template.name}</h5>
                                        <p className="text-sm text-gray-400">{template.description}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">JSON Schema Basics</h3>
                    <p className="mb-3">
                      If you're creating a custom schema, you'll need to understand JSON Schema format. Here's a simple example:
                    </p>
                    <pre className="bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "price": { "type": "number" }
  },
  "required": ["id", "name"]
}`}
                    </pre>
                    <p className="mt-3 text-sm">
                      <strong className="text-white">Tip:</strong> Start with a template and modify it, or consult with a developer if you need a complex schema.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">Need Help?</h3>
                    <p>
                      If you're not familiar with database schemas or JSON Schema format, we recommend:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                      <li>Using the pre-built templates (Real Estate, Inventory, Appointments)</li>
                      <li>Consulting with your IT team or a developer</li>
                      <li>Starting simple and adding more fields later</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowHelp(false)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template Selection */}
          {showTemplates && (
            <div className="bg-gray-700 rounded-lg p-6 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-white">Choose a Template</h4>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-6">
                {['Business', 'CRM', 'HR', 'Marketing'].map((category) => {
                  const categoryTemplates = Object.entries(schemaTemplates).filter(
                    ([_, template]) => template.category === category
                  );
                  
                  if (categoryTemplates.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      <h5 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                        {category}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryTemplates.map(([key, template]) => {
                          const Icon = template.icon;
                          return (
                            <button
                              key={key}
                              onClick={() => handleUseTemplate(key)}
                              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-600 transition-all border-2 border-transparent hover:border-purple-500 text-left"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="bg-purple-600/20 p-2 rounded-lg flex-shrink-0">
                                  <Icon className="h-6 w-6 text-purple-400" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-white mb-1">{template.name}</h5>
                                  <p className="text-sm text-gray-400">{template.description}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schema Form */}
          {showSchemaForm && (
            <div className="bg-gray-700 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-white">Create New Schema</h4>
                <button
                  onClick={() => setShowSchemaForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Schema Name *
                  </label>
                  <input
                    type="text"
                    value={schemaForm.schema_name}
                    onChange={(e) => setSchemaForm({ ...schemaForm, schema_name: e.target.value })}
                    placeholder="e.g., real_estate, inventory"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country Code (ISO)
                  </label>
                  <input
                    type="text"
                    value={schemaForm.country_code}
                    onChange={(e) => setSchemaForm({ ...schemaForm, country_code: e.target.value })}
                    placeholder="e.g., US, GB, RW"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Region (Optional)
                </label>
                <input
                  type="text"
                  value={schemaForm.region}
                  onChange={(e) => setSchemaForm({ ...schemaForm, region: e.target.value })}
                  placeholder="e.g., California, London"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Schema Definition (JSON Schema) *
                </label>
                <textarea
                  value={schemaForm.schema_definition}
                  onChange={(e) => setSchemaForm({ ...schemaForm, schema_definition: e.target.value })}
                  placeholder='{"type": "object", "properties": {...}}'
                  rows={10}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Define the structure of your data using JSON Schema format
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowSchemaForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSchema}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Schema
                </button>
              </div>
            </div>
          )}

          {/* Schemas List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {schemas.map((schema) => {
              // Determine icon based on schema name
              const getSchemaIcon = () => {
                const name = schema.schema_name.toLowerCase();
                if (name.includes('real_estate') || name.includes('real-estate') || name.includes('real estate')) {
                  return Home;
                } else if (name.includes('inventory') || name.includes('product')) {
                  return Package;
                } else if (name.includes('appointment') || name.includes('booking')) {
                  return Calendar;
                }
                return Database;
              };
              const SchemaIcon = getSchemaIcon();

              // Get properties count from schema definition
              const propertiesCount = schema.schema_definition?.properties 
                ? Object.keys(schema.schema_definition.properties).length 
                : 0;

              return (
                <div
                  key={schema.id}
                  onClick={() => {
                    setSelectedSchema(schema);
                    setActiveView('data');
                  }}
                  className="bg-gray-700 rounded-lg p-5 cursor-pointer hover:bg-gray-600 transition-all border-2 border-transparent hover:border-purple-500 shadow-lg hover:shadow-purple-500/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-600/20 p-2 rounded-lg">
                        <SchemaIcon className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white">{schema.schema_name}</h4>
                        <p className="text-xs text-gray-400">Version {schema.schema_version}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {schema.is_active && (
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => handleDeleteSchema(schema.id, schema.schema_name, e)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete Schema"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {schema.country_code && (
                    <div className="flex items-center text-sm text-gray-400 mb-3">
                      <Globe className="h-4 w-4 mr-1" />
                      {schema.country_code}
                      {schema.region && ` - ${schema.region}`}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-400">
                      <Layers className="h-4 w-4 mr-1" />
                      {propertiesCount} fields
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSchemaVisualization(true);
                        setSelectedSchema(schema);
                      }}
                      className="text-purple-400 hover:text-purple-300 flex items-center"
                      title="View Schema Structure"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Schema Visualization Modal */}
          {showSchemaVisualization && selectedSchema && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <Layers className="h-6 w-6 mr-2" />
                    Schema Structure: {selectedSchema.schema_name}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSchemaVisualization(false);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Schema Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Version:</span>
                        <span className="text-white ml-2">{selectedSchema.schema_version}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <span className={`ml-2 ${selectedSchema.is_active ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedSchema.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {selectedSchema.country_code && (
                        <div>
                          <span className="text-gray-400">Country:</span>
                          <span className="text-white ml-2">{selectedSchema.country_code}</span>
                        </div>
                      )}
                      {selectedSchema.region && (
                        <div>
                          <span className="text-gray-400">Region:</span>
                          <span className="text-white ml-2">{selectedSchema.region}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Data Fields</h3>
                    {selectedSchema.schema_definition?.properties ? (
                      <div className="space-y-2">
                        {Object.entries(selectedSchema.schema_definition.properties).map(([key, value]: [string, any]) => (
                          <div key={key} className="bg-gray-800 rounded p-3 flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white">{key}</span>
                                {selectedSchema.schema_definition.required?.includes(key) && (
                                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded">Required</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400 mt-1">
                                Type: <span className="text-purple-300">{value.type || 'any'}</span>
                                {value.description && ` • ${value.description}`}
                              </p>
                              {value.enum && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Options: {value.enum.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No properties defined</p>
                    )}
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Raw JSON Schema</h3>
                    <pre className="bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto text-gray-300">
                      {JSON.stringify(selectedSchema.schema_definition, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowSchemaVisualization(false)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {schemas.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-400">
              <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No schemas created yet</p>
              <p className="text-sm mb-4">Get started by choosing a template or creating a custom schema</p>
              <button
                onClick={() => setShowTemplates(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-flex items-center"
              >
                <Layers className="h-4 w-4 mr-2" />
                Browse Templates
              </button>
            </div>
          )}
        </div>
      )}

      {/* Data View */}
      {activeView === 'data' && (
        <div className="space-y-4">
          {!selectedSchema ? (
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Select a Schema</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Choose a schema to view and manage its data entries
                </p>
                {schemas.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No schemas created yet</p>
                    <p className="text-sm mt-2">Create a schema first to start adding data</p>
                    <button
                      onClick={() => setActiveView('schemas')}
                      className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Go to Schemas
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schemas.map((schema) => {
                      const getSchemaIcon = () => {
                        const name = schema.schema_name.toLowerCase();
                        if (name.includes('real_estate') || name.includes('real-estate') || name.includes('real estate')) {
                          return Home;
                        } else if (name.includes('inventory') || name.includes('product')) {
                          return Package;
                        } else if (name.includes('appointment') || name.includes('booking')) {
                          return Calendar;
                        }
                        return Database;
                      };
                      const SchemaIcon = getSchemaIcon();

                      return (
                        <button
                          key={schema.id}
                          onClick={() => setSelectedSchema(schema)}
                          className="bg-gray-800 rounded-lg p-4 hover:bg-gray-600 transition-all border-2 border-transparent hover:border-purple-500 text-left"
                        >
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="bg-purple-600/20 p-2 rounded-lg">
                              <SchemaIcon className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-white">{schema.schema_name}</h4>
                              <p className="text-xs text-gray-400">Version {schema.schema_version}</p>
                            </div>
                          </div>
                          {schema.country_code && (
                            <div className="flex items-center text-xs text-gray-400 mt-2">
                              <Globe className="h-3 w-3 mr-1" />
                              {schema.country_code}
                              {schema.region && ` - ${schema.region}`}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedSchema(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Back to schema selection"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {selectedSchema.schema_name} Data
                    </h3>
                    <p className="text-sm text-gray-400">
                      {dataEntries.length} entries
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowBulkImport(!showBulkImport)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Bulk Import
                  </button>
                  <button
                    onClick={() => setShowDataForm(!showDataForm)}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search entries..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <select
                    value={searchMode}
                    onChange={(e) => setSearchMode(e.target.value as 'text' | 'semantic')}
                    className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="text">Text Search</option>
                    <option value="semantic">Semantic Search</option>
                  </select>
                  <button
                    onClick={searchMode === 'semantic' ? handleSemanticSearch : handleTextSearch}
                    disabled={loading}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </button>
                </div>
              </div>

              {/* Bulk Import Form */}
              {showBulkImport && (
                <div className="bg-gray-700 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-white">Bulk Import Data</h4>
                    <button
                      onClick={() => setShowBulkImport(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex space-x-2 mb-4">
                    <button
                      onClick={() => setBulkImportFormat('json')}
                      className={`px-4 py-2 rounded-lg ${
                        bulkImportFormat === 'json'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => setBulkImportFormat('csv')}
                      className={`px-4 py-2 rounded-lg ${
                        bulkImportFormat === 'csv'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      CSV
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Import Data ({bulkImportFormat.toUpperCase()}) *
                    </label>
                    <textarea
                      value={bulkImportData}
                      onChange={(e) => setBulkImportData(e.target.value)}
                      placeholder={
                        bulkImportFormat === 'json'
                          ? '[\n  {"id": "prop-001", "address": {...}, "price": 850000},\n  {"id": "prop-002", ...}\n]'
                          : 'id,address_street,address_city,price,property_type\nprop-001,123 Main St,San Francisco,850000,house'
                      }
                      rows={12}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {bulkImportFormat === 'json'
                        ? 'Provide an array of JSON objects matching your schema'
                        : 'CSV format: First row should be headers, subsequent rows are data'}
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowBulkImport(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkImport}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Import
                    </button>
                  </div>
                </div>
              )}

              {/* Data Entry Form */}
              {showDataForm && (
                <div className="bg-gray-700 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-white">Add New Entry</h4>
                    <div className="flex items-center space-x-2">
                      {selectedSchema && (selectedSchema.schema_name.toLowerCase().includes('real_estate') || 
                        selectedSchema.schema_name.toLowerCase().includes('real-estate') ||
                        selectedSchema.schema_name.toLowerCase().includes('real estate')) && (
                        <div className="flex items-center space-x-2">
                          <Home className="h-5 w-5 text-purple-400" />
                          <label className="flex items-center text-sm text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useRealEstateForm}
                              onChange={(e) => setUseRealEstateForm(e.target.checked)}
                              className="mr-2"
                            />
                            Use Real Estate Form
                          </label>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setShowDataForm(false);
                          setUseRealEstateForm(false);
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Real Estate Form */}
                  {useRealEstateForm && selectedSchema?.schema_name === 'real_estate' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Property ID
                          </label>
                          <input
                            type="text"
                            value={realEstateForm.id}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, id: e.target.value })}
                            placeholder="prop-001"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Property Type
                          </label>
                          <select
                            value={realEstateForm.property_type}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, property_type: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="house">House</option>
                            <option value="apartment">Apartment</option>
                            <option value="condo">Condo</option>
                            <option value="townhouse">Townhouse</option>
                            <option value="land">Land</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Street Address
                        </label>
                        <input
                          type="text"
                          value={realEstateForm.address_street}
                          onChange={(e) => setRealEstateForm({ ...realEstateForm, address_street: e.target.value })}
                          placeholder="123 Main St"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            value={realEstateForm.address_city}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, address_city: e.target.value })}
                            placeholder="San Francisco"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            State
                          </label>
                          <input
                            type="text"
                            value={realEstateForm.address_state}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, address_state: e.target.value })}
                            placeholder="CA"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            ZIP Code
                          </label>
                          <input
                            type="text"
                            value={realEstateForm.address_zip}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, address_zip: e.target.value })}
                            placeholder="94102"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Bedrooms
                          </label>
                          <input
                            type="number"
                            value={realEstateForm.bedrooms}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, bedrooms: e.target.value })}
                            placeholder="3"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Bathrooms
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={realEstateForm.bathrooms}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, bathrooms: e.target.value })}
                            placeholder="2"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Square Feet
                          </label>
                          <input
                            type="number"
                            value={realEstateForm.square_feet}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, square_feet: e.target.value })}
                            placeholder="1800"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Lot Size (sq ft)
                          </label>
                          <input
                            type="number"
                            value={realEstateForm.lot_size}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, lot_size: e.target.value })}
                            placeholder="5000"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Price *
                          </label>
                          <input
                            type="number"
                            value={realEstateForm.price}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, price: e.target.value })}
                            placeholder="850000"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Currency
                          </label>
                          <select
                            value={realEstateForm.currency}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, currency: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                            <option value="EUR">EUR</option>
                            <option value="RWF">RWF</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Listing Status
                          </label>
                          <select
                            value={realEstateForm.listing_status}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, listing_status: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="sold">Sold</option>
                            <option value="off_market">Off Market</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={realEstateForm.description}
                          onChange={(e) => setRealEstateForm({ ...realEstateForm, description: e.target.value })}
                          placeholder="Beautiful Victorian home in the heart of San Francisco..."
                          rows={4}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Features (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={realEstateForm.features}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, features: e.target.value })}
                            placeholder="hardwood floors, updated kitchen, garden"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Year Built
                          </label>
                          <input
                            type="number"
                            value={realEstateForm.year_built}
                            onChange={(e) => setRealEstateForm({ ...realEstateForm, year_built: e.target.value })}
                            placeholder="1920"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          MLS Number
                        </label>
                        <input
                          type="text"
                          value={realEstateForm.mls_number}
                          onChange={(e) => setRealEstateForm({ ...realEstateForm, mls_number: e.target.value })}
                          placeholder="MLS-12345"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setShowDataForm(false);
                            setUseRealEstateForm(false);
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleRealEstateSubmit}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Property
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Data (JSON) *
                        </label>
                        <textarea
                          value={dataForm.data}
                          onChange={(e) => setDataForm({ ...dataForm, data: e.target.value })}
                          placeholder='{"id": "prop-001", "address": {...}, "price": 850000}'
                          rows={10}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Tags (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={dataForm.tags}
                            onChange={(e) => setDataForm({ ...dataForm, tags: e.target.value })}
                            placeholder="san-francisco, 3-bedroom"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Status
                          </label>
                          <select
                            value={dataForm.status}
                            onChange={(e) => setDataForm({ ...dataForm, status: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                            <option value="pending">Pending</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setShowDataForm(false)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateDataEntry}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Entry
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Data Entries List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold">
                          {entry.data?.id || entry.data?.name || 'Entry'}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="text-sm text-gray-300 line-clamp-3">
                        {JSON.stringify(entry.data, null, 2).substring(0, 150)}...
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {dataEntries.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-400">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No data entries yet</p>
                  <p className="text-sm mt-2">Add entries to this schema</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Agent Access View */}
      {activeView === 'agents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-white">Agent Access Control</h3>
              <p className="text-sm text-gray-400 mt-1">
                Grant agents access to specific data schemas
              </p>
            </div>
            <button
              onClick={() => setShowAgentAccessForm(!showAgentAccessForm)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Grant Access
            </button>
          </div>

          {/* Grant Access Form */}
          {showAgentAccessForm && (
            <div className="bg-gray-700 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-white">Grant Agent Access</h4>
                <button
                  onClick={() => setShowAgentAccessForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Agent *
                  </label>
                  <select
                    value={agentAccessForm.agent_id}
                    onChange={(e) => setAgentAccessForm({ ...agentAccessForm, agent_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Choose an agent...</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Schema *
                  </label>
                  <select
                    value={agentAccessForm.schema_id}
                    onChange={(e) => setAgentAccessForm({ ...agentAccessForm, schema_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Choose a schema...</option>
                    {schemas.map((schema) => (
                      <option key={schema.id} value={schema.id}>
                        {schema.schema_name} {schema.country_code ? `(${schema.country_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Access Level *
                </label>
                <select
                  value={agentAccessForm.access_level}
                  onChange={(e) => setAgentAccessForm({ ...agentAccessForm, access_level: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="read">Read Only</option>
                  <option value="read_write">Read & Write</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Filters (JSON - Optional)
                </label>
                <textarea
                  value={JSON.stringify(agentAccessForm.filters, null, 2)}
                  onChange={(e) => {
                    try {
                      setAgentAccessForm({
                        ...agentAccessForm,
                        filters: JSON.parse(e.target.value)
                      });
                    } catch (e) {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder='{"status": "active", "country": "USA"}'
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Optional: Apply filters to limit what data the agent can see
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAgentAccessForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantAgentAccess}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Grant Access
                </button>
              </div>
            </div>
          )}

          {/* Agent Access List */}
          <div className="bg-gray-700 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Current Access Grants</h4>
            {!agentAccesses || agentAccesses.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No agent access grants yet</p>
                <p className="text-sm mt-2">Grant access to allow agents to use custom data</p>
              </div>
            ) : (
              <div className="space-y-2">
                {agentAccesses.map((access: any) => (
                  <div
                    key={access.id}
                    className="bg-gray-800 rounded-lg p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {access.agent_name || 'Unknown Agent'} → {access.schema_name || 'Unknown Schema'}
                      </p>
                      <p className="text-sm text-gray-400">
                        Access Level: <span className="capitalize">{access.access_level || 'read'}</span>
                        {access.is_active === false && (
                          <span className="ml-2 text-yellow-400">(Inactive)</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeAgentAccess(access.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Revoke Access"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MCP Integrations View */}
      {activeView === 'mcp' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-white">MCP Integrations</h3>
              <p className="text-sm text-gray-400 mt-1">
                Connect external data sources via Model Context Protocol (MCP)
              </p>
            </div>
            <button
              onClick={() => setShowMcpForm(!showMcpForm)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </button>
          </div>

          {/* MCP Integration Form */}
          {showMcpForm && (
            <div className="bg-gray-700 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-white">Create MCP Integration</h4>
                <button
                  onClick={() => setShowMcpForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Integration Name *
                </label>
                <input
                  type="text"
                  value={mcpForm.integration_name}
                  onChange={(e) => setMcpForm({ ...mcpForm, integration_name: e.target.value })}
                  placeholder="My Pinecone Database"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Integration Type *
                </label>
                <select
                  value={mcpForm.integration_type}
                  onChange={(e) => setMcpForm({ ...mcpForm, integration_type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="vector_db">Vector Database (Pinecone, Weaviate)</option>
                  <option value="api">REST API</option>
                  <option value="database">SQL Database</option>
                  <option value="file_system">File System</option>
                  <option value="graphql">GraphQL API</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Configuration (JSON) *
                </label>
                <textarea
                  value={mcpForm.config}
                  onChange={(e) => setMcpForm({ ...mcpForm, config: e.target.value })}
                  placeholder={
                    mcpForm.integration_type === 'vector_db'
                      ? '{\n  "api_key": "your-api-key",\n  "environment": "us-east-1",\n  "index_name": "my-index"\n}'
                      : '{\n  "base_url": "https://api.example.com",\n  "auth_type": "bearer",\n  "api_key": "your-key"\n}'
                  }
                  rows={8}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Provide connection details and credentials for the integration
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Capabilities
                </label>
                <div className="space-y-2">
                  {(['read', 'write', 'search', 'sync'] as const).map((cap) => (
                    <label key={cap} className="flex items-center text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mcpForm.capabilities.includes(cap as string)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMcpForm({
                              ...mcpForm,
                              capabilities: [...mcpForm.capabilities, cap as string]
                            });
                          } else {
                            setMcpForm({
                              ...mcpForm,
                              capabilities: mcpForm.capabilities.filter((c: string) => c !== cap)
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="capitalize">{cap}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowMcpForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMcpIntegration}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Integration
                </button>
              </div>
            </div>
          )}

          {/* MCP Integrations List */}
          <div className="bg-gray-700 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Active Integrations</h4>
            {mcpIntegrations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No MCP integrations yet</p>
                <p className="text-sm mt-2">Connect external data sources to expand your agents' knowledge</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mcpIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="bg-gray-800 rounded-lg p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-white font-medium">{integration.integration_name}</p>
                      <p className="text-sm text-gray-400">
                        Type: <span className="capitalize">{integration.integration_type}</span> | 
                        Capabilities: {integration.capabilities?.join(', ') || 'None'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Status: <span className={integration.is_active ? 'text-green-400' : 'text-red-400'}>
                          {integration.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // Handle test connection
                        }}
                        className="text-blue-400 hover:text-blue-300"
                        title="Test Connection"
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          // Handle delete
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomData;

