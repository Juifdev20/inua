# 📋 PROMPT - Interface Réception: Réception des Consultations du Docteur

## 🎯 **Objectif**
Créer une interface réception qui reçoit automatiquement les consultations prescrites par le docteur et permet le traitement des paiements.

---

## 🏥 **Flux de Travail Réception**

### **1. Réception Automatique des Consultations**
```javascript
// useEffect pour écouter les nouvelles consultations
useEffect(() => {
  // WebSocket ou polling pour recevoir les nouvelles prescriptions
  const fetchPendingPayments = async () => {
    try {
      const response = await axios.get('/api/v1/reception/pending-payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingPayments(response.data);
      
      // Notification sonore/visuelle pour nouvelle consultation
      if (response.data.length > previousCount) {
        notification.info({
          message: 'Nouvelle Consultation',
          description: `${response.data[0].patientName} a été envoyé par le Dr. ${response.data[0].doctorName}`,
          icon: <UserOutlined style={{ color: '#1890ff' }} />
        });
      }
    } catch (error) {
      message.error('Erreur lors de la récupération des consultations');
    }
  };

  // Rafraîchissement automatique toutes les 30 secondes
  const interval = setInterval(fetchPendingPayments, 30000);
  fetchPendingPayments();
  
  return () => clearInterval(interval);
}, [token]);
```

---

### **2. Interface de Réception - Design Complet**

```jsx
import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Input, Table, Tag, Space, message, Modal, Badge, 
  Tabs, Statistic, Row, Col, Alert, Timeline, Avatar, Typography
} from 'antd';
import { 
  UserOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  BellOutlined, MedicineBoxOutlined, PhoneOutlined, MailOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ReceptionDashboard = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalAmount: 0,
    todayProcessed: 0,
    todayRevenue: 0
  });

  // Récupérer les statistiques
  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/v1/reception/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Stats error:', error);
    }
  };

  // Récupérer les paiements en attente
  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/reception/pending-payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newPayments = response.data;
      const oldCount = pendingPayments.length;
      
      setPendingPayments(newPayments);
      
      // Notification pour nouvelle consultation
      if (newPayments.length > oldCount && oldCount > 0) {
        const latestPayment = newPayments[0];
        notification.info({
          message: '📋 Nouvelle Consultation Reçue',
          description: (
            <div>
              <div><strong>{latestPayment.patientName}</strong></div>
              <div>Envoyée par: Dr. {latestPayment.doctorName}</div>
              <div>Montant: {parseFloat(latestPayment.totalAmount).toLocaleString()} F</div>
            </div>
          ),
          duration: 8,
          icon: <BellOutlined style={{ color: '#1890ff' }} />
        });
      }
    } catch (error) {
      message.error('Erreur lors de la récupération des consultations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
    fetchStats();
    
    // Rafraîchissement automatique toutes les 30 secondes
    const interval = setInterval(() => {
      fetchPendingPayments();
      fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Interface principale avec onglets
  return (
    <div style={{ padding: '24px' }}>
      {/* Header avec statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Consultations en Attente"
              value={stats.totalPending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Montant Total en Attente"
              value={stats.totalAmount}
              prefix={<DollarOutlined />}
              suffix="F"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Traitées Aujourd'hui"
              value={stats.todayProcessed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Revenus du Jour"
              value={stats.todayRevenue}
              prefix={<DollarOutlined />}
              suffix="F"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Onglets */}
      <Tabs defaultActiveKey="pending">
        <TabPane 
          tab={
            <span>
              <ClockCircleOutlined />
              En Attente de Paiement
              <Badge count={pendingPayments.length} style={{ marginLeft: 8 }} />
            </span>
          } 
          key="pending"
        >
          <PendingPaymentsTable 
            pendingPayments={pendingPayments}
            loading={loading}
            onPayment={openPaymentModal}
          />
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <CheckCircleOutlined />
              Traitées Aujourd'hui
            </span>
          } 
          key="processed"
        >
          <ProcessedTodayTable />
        </TabPane>
      </Tabs>

      {/* Modal de paiement */}
      <PaymentModal
        visible={modalVisible}
        payment={selectedPayment}
        amountReceived={amountReceived}
        setAmountReceived={setAmountReceived}
        onClose={() => setModalVisible(false)}
        onPayment={handlePayment}
        onSendToLab={handleSendToLab}
      />
    </div>
  );
};

// Composant tableau des paiements en attente
const PendingPaymentsTable = ({ pendingPayments, loading, onPayment }) => {
  const columns = [
    {
      title: 'Patient',
      dataIndex: 'patientName',
      key: 'patientName',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            src={record.patientPhoto} 
            icon={<UserOutlined />}
            style={{ marginRight: 12 }}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <div style={{ color: '#666', fontSize: '12px' }}>
              {record.patientCode} | {record.patientPhone}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Docteur',
      dataIndex: 'doctorName',
      key: 'doctorName',
      render: (text) => (
        <Tag color="blue">{text}</Tag>
      )
    },
    {
      title: 'Examens Prescrits',
      key: 'exams',
      render: (text, record) => (
        <div>
          {record.prescribedExams.map((exam, index) => (
            <Tag key={index} color="green" style={{ marginBottom: 4 }}>
              <MedicineBoxOutlined style={{ marginRight: 4 }} />
              {exam.serviceName}
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: 'Montant Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => (
        <span style={{ 
          fontWeight: 'bold', 
          color: '#1890ff',
          fontSize: '16px'
        }}>
          {parseFloat(amount).toLocaleString()} F
        </span>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color="orange" icon={<ClockCircleOutlined />}>
          En attente de paiement
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<DollarOutlined />}
            onClick={() => onPayment(record)}
            size="large"
          >
            Traiter Paiement
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={pendingPayments}
      rowKey="consultationId"
      loading={loading}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} consultations en attente`
      }}
      rowClassName={(record) => record.status === 'PENDING_PAYMENT' ? 'highlight-row' : ''}
    />
  );
};

export default ReceptionDashboard;
```

---

## 🔄 **Workflow Complet pour la Réception**

### **Étape 1: Réception Automatique**
```javascript
// Le réceptionniste voit automatiquement les nouvelles consultations
// envoyées par le docteur avec notification en temps réel
```

### **Étape 2: Validation des Informations**
```javascript
// Affichage complet:
// - Photo et identité du patient
// - Nom du docteur qui a prescrit
// - Liste détaillée des examens
// - Montant total calculé automatiquement
```

### **Étape 3: Traitement du Paiement**
```javascript
// Validation stricte:
// - Montant reçu doit être exactement égal au total
// - Bouton "Envoyer au Labo" grisé si incorrect
// - Confirmation avant traitement
```

### **Étape 4: Envoi au Laboratoire**
```javascript
// Transition automatique:
// PENDING_PAYMENT → PAID_PENDING_LAB → IN_PROGRESS
```

---

## 📱 **Interface Mobile-Friendly**

```jsx
// Version mobile optimisée
const MobileReceptionView = () => (
  <div className="mobile-reception">
    {/* Cartes pour mobile au lieu de tableau */}
    {pendingPayments.map(payment => (
      <Card key={payment.consultationId} size="small">
        <div className="patient-header">
          <Avatar src={payment.patientPhoto} size="large" />
          <div>
            <Title level={5}>{payment.patientName}</Title>
            <Text type="secondary">Dr. {payment.doctorName}</Text>
          </div>
        </div>
        
        <div className="exam-list">
          {payment.prescribedExams.map(exam => (
            <Tag key={exam.id}>{exam.serviceName}</Tag>
          ))}
        </div>
        
        <div className="payment-section">
          <Statistic
            title="Montant Total"
            value={payment.totalAmount}
            suffix="F"
            valueStyle={{ color: '#1890ff' }}
          />
        </div>
        
        <Button 
          type="primary" 
          block 
          icon={<DollarOutlined />}
          onClick={() => openPaymentModal(payment)}
        >
          Traiter Paiement
        </Button>
      </Card>
    ))}
  </div>
);
```

---

## 🎯 **Points Clés du Prompt**

1. **Réception Automatique**: Les consultations apparaissent en temps réel
2. **Notifications**: Alertes visuelles et sonores pour nouvelles prescriptions
3. **Validation Stricte**: Montant exact requis pour validation
4. **Interface Intuitive**: Photos patients, infos complètes, statuts clairs
5. **Workflow Fluid**: Du docteur → réception → laboratoire sans interruption
6. **Statistiques en Temps Réel**: Suivi des performances quotidiennes
7. **Mobile-Friendly**: Accessible sur tous les appareils

---

## 🚀 **Résultat Attendu**

La réception peut maintenant:
- ✅ **Recevoir** automatiquement les consultations du docteur
- ✅ **Voir** toutes les informations nécessaires (patient, docteur, examens)
- ✅ **Valider** les paiements avec contrôle strict
- ✅ **Envoyer** au laboratoire en un clic
- ✅ **Suivre** les statistiques en temps réel

**Le flux hospitalier est maintenant entièrement automatisé !** 🎉
