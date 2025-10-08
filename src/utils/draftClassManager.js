import fs from 'fs';
import path from 'path';

const DRAFT_CLASSES_FILE = path.join(process.cwd(), 'data/draftClasses.json');

export class DraftClassManager {
    /**
     * Get all available draft classes
     */
    static getAvailableClasses() {
        try {
            // Check if file exists, create if not
            if (!fs.existsSync(DRAFT_CLASSES_FILE)) {
                console.log('Draft classes file not found, creating default...');
                const defaultConfig = {
                    availableClasses: [
                        {
                            id: "CUS01",
                            name: "2026 Custom Class 01",
                            folder: "CUS01",
                            year: "2k26",
                            active: true
                        },
                        {
                            id: "CUS02",
                            name: "2026 Custom Class 02",
                            folder: "CUS02",
                            year: "2k26",
                            active: false
                        }
                    ],
                    currentClass: "CUS01"
                };
                
                // Ensure data directory exists
                const dataDir = path.dirname(DRAFT_CLASSES_FILE);
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }
                
                fs.writeFileSync(DRAFT_CLASSES_FILE, JSON.stringify(defaultConfig, null, 2));
                return defaultConfig;
            }
            
            const data = fs.readFileSync(DRAFT_CLASSES_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading draft classes:', error);
            console.error('Error details:', error.stack);
            
            // Return safe fallback
            return {
                availableClasses: [
                    {
                        id: "CUS01",
                        name: "2026 Custom Class 01",
                        folder: "CUS01",
                        year: "2k26",
                        active: true
                    }
                ],
                currentClass: "CUS01"
            };
        }
    }

    /**
     * Get the currently active draft class
     */
    static getCurrentClass() {
        const config = this.getAvailableClasses();
        return config.availableClasses.find(c => c.id === config.currentClass) || config.availableClasses[0];
    }

    /**
     * Set the active draft class
     */
    static setCurrentClass(classId) {
        const config = this.getAvailableClasses();

        // Validate class exists
        const classExists = config.availableClasses.some(c => c.id === classId);
        if (!classExists) {
            throw new Error(`Draft class '${classId}' not found`);
        }

        // Update current class
        config.currentClass = classId;

        // Update active flags
        config.availableClasses.forEach(c => {
            c.active = c.id === classId;
        });

        // Save configuration
        fs.writeFileSync(DRAFT_CLASSES_FILE, JSON.stringify(config, null, 2));
        return config;
    }

    /**
     * Add a new draft class
     */
    static addDraftClass(classData) {
        const config = this.getAvailableClasses();

        // Validate required fields
        if (!classData.id || !classData.name || !classData.folder) {
            throw new Error('Draft class must have id, name, and folder');
        }

        // Check if class already exists
        if (config.availableClasses.some(c => c.id === classData.id)) {
            throw new Error(`Draft class '${classData.id}' already exists`);
        }

        // Add new class
        const newClass = {
            id: classData.id,
            name: classData.name,
            folder: classData.folder,
            year: classData.year || '2k26',
            active: false
        };

        config.availableClasses.push(newClass);
        fs.writeFileSync(DRAFT_CLASSES_FILE, JSON.stringify(config, null, 2));

        return newClass;
    }

    /**
     * Get prospect board paths for current class
     */
    static getCurrentProspectBoards() {
        const currentClass = this.getCurrentClass();
        if (!currentClass) {
            throw new Error('No active draft class found');
        }

        return {
            pre: `./${currentClass.folder}/${currentClass.year}_${currentClass.id} - Preseason Big Board.json`,
            mid: `./${currentClass.folder}/${currentClass.year}_${currentClass.id} - Midseason Big Board.json`,
            final: `./${currentClass.folder}/${currentClass.year}_${currentClass.id} - Final Big Board.json`
        };
    }

    /**
     * Get recruiting file path for current class
     */
    static getCurrentRecruitingFile() {
        const currentClass = this.getCurrentClass();
        if (!currentClass) {
            throw new Error('No active draft class found');
        }

        return `./${currentClass.folder}/${currentClass.year}_${currentClass.id} - Recruiting.json`;
    }

    /**
     * Get top performer file path for current class
     */
    static getCurrentTopPerformerFile() {
        const currentClass = this.getCurrentClass();
        if (!currentClass) {
            throw new Error('No active draft class found');
        }

        return `./${currentClass.folder}/${currentClass.year}_${currentClass.id} - Top Performer.json`;
    }

    /**
     * Validate that all required files exist for a draft class
     */
    static validateDraftClassFiles(classId) {
        const config = this.getAvailableClasses();
        const draftClass = config.availableClasses.find(c => c.id === classId);

        if (!draftClass) {
            throw new Error(`Draft class '${classId}' not found`);
        }

        const requiredFiles = [
            `${draftClass.folder}/${draftClass.year}_${draftClass.id} - Preseason Big Board.json`,
            `${draftClass.folder}/${draftClass.year}_${draftClass.id} - Midseason Big Board.json`,
            `${draftClass.folder}/${draftClass.year}_${draftClass.id} - Final Big Board.json`,
            `${draftClass.folder}/${draftClass.year}_${draftClass.id} - Recruiting.json`,
            `${draftClass.folder}/${draftClass.year}_${draftClass.id} - Top Performer.json`
        ];

        const missingFiles = [];
        for (const file of requiredFiles) {
            if (!fs.existsSync(path.join(process.cwd(), file))) {
                missingFiles.push(file);
            }
        }

        return {
            valid: missingFiles.length === 0,
            missingFiles
        };
    }
}
