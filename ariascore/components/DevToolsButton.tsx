import React, { useState } from 'react';
import { View, Button, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { resetDatabase, dropTables, initDB } from '../utils/database'; // Update this path

/**
 * A dev tools component with database management functions
 * Only use in development builds
 */
const DevToolsButton = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState('');

  // Handle database reset
  const handleResetDatabase = async () => {
    setIsLoading(true);
    try {
      await resetDatabase();
      setLastAction('Database reset successfully');
    } catch (error: any) {
      console.error('Error resetting database:', error);
      setLastAction(`Error: ${error.message}`);
      Alert.alert('Error', 'Failed to reset database');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dropping specific tables
  const handleDropTable = async (tableName: string) => {
    setIsLoading(true);
    try {
      await dropTables([tableName]);
      setLastAction(`Dropped table: ${tableName}`);
    } catch (error: any) {
      console.error(`Error dropping table ${tableName}:`, error);
      setLastAction(`Error: ${error.message}`);
      Alert.alert('Error', `Failed to drop table ${tableName}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle initializing the database
  const handleInitDB = async () => {
    setIsLoading(true);
    try {
      await initDB();
      setLastAction('Database initialized');
    } catch (error: any) {
      console.error('Error initializing database:', error);
      setLastAction(`Error: ${error.message}`);
      Alert.alert('Error', 'Failed to initialize database');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating button to open dev tools */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.floatingButtonText}>🛠️</Text>
      </TouchableOpacity>

      {/* Modal with database actions */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Database Dev Tools</Text>
            
            <View style={styles.buttonContainer}>
              <Button 
                title="Reset Database" 
                onPress={handleResetDatabase}
                disabled={isLoading}
                color="#dc3545"
              />
            </View>
            
            <View style={styles.buttonContainer}>
              <Button
                title="Initialize DB Schema"
                onPress={handleInitDB}
                disabled={isLoading}
                color="#28a745"
              />
            </View>
            
            <Text style={styles.sectionTitle}>Drop Individual Tables</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.tableButton, { backgroundColor: '#007bff' }]}
                onPress={() => handleDropTable('music_setlists')}
                disabled={isLoading}
              >
                <Text style={styles.tableButtonText}>music_setlists</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.tableButton, { backgroundColor: '#fd7e14' }]}
                onPress={() => handleDropTable('music')}
                disabled={isLoading}
              >
                <Text style={styles.tableButtonText}>music</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.tableButton, { backgroundColor: '#6f42c1' }]}
                onPress={() => handleDropTable('setlists')}
                disabled={isLoading}
              >
                <Text style={styles.tableButtonText}>setlists</Text>
              </TouchableOpacity>
            </View>
            
            {lastAction ? (
              <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>Last Action:</Text>
                <Text style={styles.statusText}>{lastAction}</Text>
              </View>
            ) : null}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    left: 25,
    bottom: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 999,
  },
  floatingButtonText: {
    fontSize: 24,
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonContainer: {
    marginVertical: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  tableButton: {
    flex: 1,
    margin: 3,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  statusTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#6c757d',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default DevToolsButton;